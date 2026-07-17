const SALT = 'crypto_hub_salt_2024';

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function uint32(x: number): number {
  return x >>> 0;
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export async function hashPasscode(passcode: string): Promise<string> {
  const input = passcode + SALT;
  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;

  const withPadding = new Uint8Array(len + 1 + ((56 - (len + 1) % 64 + 64) % 64) + 8);
  withPadding.set(bytes);
  withPadding[len] = 0x80;

  const bitLen = len * 8;
  const dv = new DataView(withPadding.buffer);
  dv.setUint32(withPadding.length - 4, bitLen >>> 0, false);
  dv.setUint32(withPadding.length - 8, Math.floor(bitLen / 0x100000000), false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const W = new Uint32Array(64);
  const chunkDv = new DataView(withPadding.buffer);

  for (let off = 0; off < withPadding.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = chunkDv.getUint32(off + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
      const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
      W[i] = uint32(W[i - 16] + s0 + W[i - 7] + s1);
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = uint32(h + S1 + ch + K[i] + W[i]);
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = uint32(S0 + maj);

      h = g; g = f; f = e; e = uint32(d + temp1);
      d = c; c = b; b = a; a = uint32(temp1 + temp2);
    }

    H[0] = uint32(H[0] + a);
    H[1] = uint32(H[1] + b);
    H[2] = uint32(H[2] + c);
    H[3] = uint32(H[3] + d);
    H[4] = uint32(H[4] + e);
    H[5] = uint32(H[5] + f);
    H[6] = uint32(H[6] + g);
    H[7] = uint32(H[7] + h);
  }

  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += H[i].toString(16).padStart(8, '0');
  }
  return hex;
}
