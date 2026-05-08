// Decodes any browser-supported audio blob and re-encodes as PCM WAV.
// BirdNET works best with mono 48 kHz audio.
export async function blobToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext({ sampleRate: 48000 })
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    const wav = encodeWav(decoded)
    return new Blob([wav], { type: 'audio/wav' })
  } finally {
    await ctx.close()
  }
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1 // mono — BirdNET requirement
  const sampleRate = buffer.sampleRate
  const bitsPerSample = 16
  const samples = downsampleToMono(buffer)
  const dataLength = samples.length * 2 // 16-bit = 2 bytes per sample
  const totalLength = 44 + dataLength

  const out = new DataView(new ArrayBuffer(totalLength))
  let offset = 0

  function writeStr(s: string) {
    for (let i = 0; i < s.length; i++) out.setUint8(offset++, s.charCodeAt(i))
  }
  function writeU32(v: number) { out.setUint32(offset, v, true); offset += 4 }
  function writeU16(v: number) { out.setUint16(offset, v, true); offset += 2 }

  writeStr('RIFF')
  writeU32(totalLength - 8)
  writeStr('WAVE')
  writeStr('fmt ')
  writeU32(16)             // chunk size
  writeU16(1)              // PCM
  writeU16(numChannels)
  writeU32(sampleRate)
  writeU32(sampleRate * numChannels * (bitsPerSample / 8))
  writeU16(numChannels * (bitsPerSample / 8))
  writeU16(bitsPerSample)
  writeStr('data')
  writeU32(dataLength)

  for (const s of samples) {
    const clamped = Math.max(-1, Math.min(1, s))
    out.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return out.buffer
}

function downsampleToMono(buffer: AudioBuffer): Float32Array {
  // Mix all channels to mono
  const length = buffer.length
  const mono = new Float32Array(length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) mono[i] += ch[i]
  }
  if (buffer.numberOfChannels > 1) {
    const inv = 1 / buffer.numberOfChannels
    for (let i = 0; i < length; i++) mono[i] *= inv
  }
  return mono
}
