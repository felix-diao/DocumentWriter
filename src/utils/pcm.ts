export function downsampleBuffer(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (!input?.length) return new Float32Array();
  if (outputSampleRate === inputSampleRate) return input;
  if (outputSampleRate > inputSampleRate) return input;

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / sampleRateRatio);
  const output = new Float32Array(outputLength);

  let outputOffset = 0;
  let inputOffset = 0;
  while (outputOffset < outputLength) {
    const nextInputOffset = Math.round((outputOffset + 1) * sampleRateRatio);
    let sum = 0;
    let count = 0;
    for (let i = inputOffset; i < nextInputOffset && i < input.length; i += 1) {
      sum += input[i];
      count += 1;
    }
    output[outputOffset] = count ? sum / count : 0;
    outputOffset += 1;
    inputOffset = nextInputOffset;
  }

  return output;
}

export function float32ToInt16PCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

