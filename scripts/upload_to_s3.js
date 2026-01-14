#!/usr/bin/env node
/**
 * Upload Pre-Mortem Report to SeaweedFS (S3-compatible)
 *
 * Usage: node scripts/upload_to_s3.js [report_path]
 *
 * Environment variables:
 *   S3_ENDPOINT - SeaweedFS S3 endpoint (default: http://localhost:8333)
 *   S3_BUCKET - Bucket name (default: product-factory-artifacts)
 *   S3_ACCESS_KEY - S3 access key
 *   S3_SECRET_KEY - S3 secret key
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:8333';
const S3_BUCKET = process.env.S3_BUCKET || 'product-factory-artifacts';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || '';
const S3_REGION = process.env.S3_REGION || 'us-east-1';

/**
 * Generate AWS Signature v4 for S3 requests
 */
function generateSignature(method, path, headers, payload, timestamp, region, accessKey, secretKey) {
  const algorithm = 'AWS4-HMAC-SHA256';
  const service = 's3';

  // Format timestamp
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Create canonical request
  const canonicalUri = path;
  const canonicalQueryString = '';
  const payloadHash = crypto.createHash('sha256').update(payload || '').digest('hex');

  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n';

  const signedHeaders = Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  // Create string to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  // Calculate signature
  const getSignatureKey = (key, date, region, service) => {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  };

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  // Build Authorization header
  const authorization = [
    `${algorithm} Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');

  return { authorization, amzDate, payloadHash };
}

/**
 * Upload file to S3-compatible storage
 */
async function uploadToS3(localPath, s3Key) {
  const content = fs.readFileSync(localPath, 'utf8');
  const url = new URL(S3_ENDPOINT);
  const host = url.host;
  const timestamp = new Date();

  // Prepare headers
  const headers = {
    'Host': host,
    'Content-Type': 'text/markdown; charset=utf-8',
    'x-amz-date': timestamp.toISOString().replace(/[:-]|\.\d{3}/g, ''),
    'x-amz-content-sha256': crypto.createHash('sha256').update(content).digest('hex')
  };

  // Generate signature if credentials are provided
  if (S3_ACCESS_KEY && S3_SECRET_KEY) {
    const sig = generateSignature(
      'PUT',
      `/${S3_BUCKET}/${s3Key}`,
      headers,
      content,
      timestamp,
      S3_REGION,
      S3_ACCESS_KEY,
      S3_SECRET_KEY
    );
    headers['Authorization'] = sig.authorization;
    headers['x-amz-date'] = sig.amzDate;
    headers['x-amz-content-sha256'] = sig.payloadHash;
  }

  const fullUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`;

  console.log(`📤 Uploading to: ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: headers,
      body: content
    });

    if (response.ok || response.status === 200 || response.status === 201) {
      console.log(`✅ Upload successful! Status: ${response.status}`);
      return { success: true, url: fullUrl, status: response.status };
    } else {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText.substring(0, 500)}`);
      return { success: false, status: response.status, error: errorText };
    }
  } catch (error) {
    console.error(`❌ Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const reportPath = process.argv[2] || path.join(__dirname, '..', 'PRE_MORTEM_REPORT.md');

  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report file not found: ${reportPath}`);
    console.error('   Run diagnostic_audit.js first to generate the report.');
    process.exit(1);
  }

  // Generate S3 key with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const s3Key = `admin-logs/pre_mortem_${timestamp}.md`;

  console.log('🚀 SeaweedFS S3 Upload');
  console.log('=' .repeat(50));
  console.log(`📄 Local file: ${reportPath}`);
  console.log(`🪣 Bucket: ${S3_BUCKET}`);
  console.log(`📁 S3 Key: ${s3Key}`);
  console.log(`🔗 Endpoint: ${S3_ENDPOINT}`);
  console.log();

  // Check if S3 credentials are configured
  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
    console.log('⚠️  S3 credentials not configured. Attempting anonymous upload...');
    console.log('   Set S3_ACCESS_KEY and S3_SECRET_KEY for authenticated access.');
    console.log();
  }

  const result = await uploadToS3(reportPath, s3Key);

  if (result.success) {
    console.log();
    console.log('🎉 Report uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    return 0;
  } else {
    console.log();
    console.log('❌ Upload failed. Report saved locally at:');
    console.log(`   ${reportPath}`);
    console.log();
    console.log('To upload manually, ensure SeaweedFS is running and credentials are configured:');
    console.log('   export S3_ENDPOINT=http://seaweedfs:8333');
    console.log('   export S3_BUCKET=product-factory-artifacts');
    console.log('   export S3_ACCESS_KEY=your-access-key');
    console.log('   export S3_SECRET_KEY=your-secret-key');
    console.log('   node scripts/upload_to_s3.js');
    return 1;
  }
}

// Run
main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
