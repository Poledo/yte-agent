#!/usr/bin/env node
/**
 * Đóng gói thư mục dist thành file .crx (định dạng CRX3) và in ra extension ID.
 *
 * Vì sao tự đóng gói mà không dùng chrome --pack-extension: CI chạy headless không có
 * Chrome, và CRX3 cần chữ ký ổn định từ khóa riêng — khóa này quyết định extension ID,
 * mà ID lại nằm trong update.xml và trong chính sách cài đặt GPO của máy trạm.
 *
 * Định dạng CRX3 (crx3.proto của Chromium):
 *   "Cr24" | u32 version=3 | u32 headerLen | header | zip
 *   header = CrxFileHeader {
 *     sha256_with_rsa = [ { public_key, signature } ],   // field 2
 *     signed_header_data = SignedData { crx_id }.serialize()  // field 10000
 *   }
 *   signature = RSA-SHA256( "CRX3 SignedData" | u32 len(signedHeaderData) | signedHeaderData | zip )
 *
 * Extension ID = 32 ký tự đầu của SHA256(publicKey DER), ánh xạ 0-9a-f → a-p.
 *
 * Cách dùng: node pack-crx.mjs <khóa.pem> <thư-mục-dist> <file-ra.crx>
 */
import { createHash, createPrivateKey, createPublicKey, createSign } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const [keyPath, distDir, outPath] = process.argv.slice(2)
if (!keyPath || !distDir || !outPath) {
    console.error('Cách dùng: node pack-crx.mjs <khóa.pem> <thư-mục-dist> <file-ra.crx>')
    process.exit(1)
}

// ---- Mã hóa protobuf tối thiểu (chỉ wire type 2: length-delimited) ----
const varint = (n) => {
    const bytes = []
    while (n > 0x7f) {
        bytes.push((n & 0x7f) | 0x80)
        n >>>= 7
    }
    bytes.push(n & 0x7f)
    return Buffer.from(bytes)
}
const field = (num, buf) => Buffer.concat([varint((num << 3) | 2), varint(buf.length), buf])

// ---- Nén dist thành zip (dùng lệnh zip của hệ thống, cùng cách workflow đang làm) ----
const tmp = mkdtempSync(join(tmpdir(), 'crx-'))
const zipPath = join(tmp, 'ext.zip')
try {
    execFileSync('zip', ['-qr', zipPath, '.'], { cwd: resolve(distDir), stdio: 'pipe' })
} catch (err) {
    console.error('Không chạy được lệnh zip:', err.message)
    process.exit(1)
}
const zip = readFileSync(zipPath)
rmSync(tmp, { recursive: true, force: true })

// ---- Khóa và ID ----
const privateKey = createPrivateKey(readFileSync(keyPath))
const publicKeyDer = createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
const idHex = createHash('sha256').update(publicKeyDer).digest('hex').slice(0, 32)
const crxId = Buffer.from(idHex, 'hex') // 16 byte — đúng yêu cầu của crx3.proto
const extensionId = idHex.replace(/[0-9a-f]/g, (c) => 'abcdefghijklmnop'[parseInt(c, 16)])

// ---- SignedData { crx_id = 1 } ----
const signedHeaderData = field(1, crxId)

// ---- Chữ ký: "CRX3 SignedData" | u32 len | signedHeaderData | zip ----
const lenBuf = Buffer.alloc(4)
lenBuf.writeUInt32LE(signedHeaderData.length)
const toSign = Buffer.concat([Buffer.from('CRX3 SignedData'), lenBuf, signedHeaderData, zip])
const signature = createSign('sha256').update(toSign).sign(privateKey)

// ---- AsymmetricKeyProof { public_key = 1, signature = 2 } ----
const keyProof = Buffer.concat([field(1, publicKeyDer), field(2, signature)])

// ---- CrxFileHeader { sha256_with_rsa = 2, signed_header_data = 10000 } ----
const header = Buffer.concat([field(2, keyProof), field(10000, signedHeaderData)])

const magic = Buffer.from('Cr24')
const sizes = Buffer.alloc(8)
sizes.writeUInt32LE(3, 0) // version
sizes.writeUInt32LE(header.length, 4)
const crx = Buffer.concat([magic, sizes, header, zip])
writeFileSync(resolve(outPath), crx)

console.log(`CRX: ${resolve(outPath)} (${crx.length} bytes)`)
console.log(`EXTENSION_ID=${extensionId}`)
