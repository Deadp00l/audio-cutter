const fileInput = document.querySelector('input[type="file"]');
const trimButton = document.querySelector('button');
const startInput = document.querySelectorAll('input')[1];
const endInput = document.querySelectorAll('input')[2];

trimButton.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return alert('Please upload an audio file.');

  const startTime = parseFloat(startInput.value);
  const endTime = parseFloat(endInput.value);

  if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
    return alert('Enter valid start and end times.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const startSample = Math.floor(startTime * audioBuffer.sampleRate);
  const endSample = Math.floor(endTime * audioBuffer.sampleRate);
  const length = endSample - startSample;

  const trimmedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    length,
    audioBuffer.sampleRate
  );

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    const channelData = audioBuffer.getChannelData(i);
    trimmedBuffer.copyToChannel(
      channelData.slice(startSample, endSample),
      i
    );
  }

  const wavBlob = bufferToWave(trimmedBuffer, length);
  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trimmed_audio.wav';
  a.textContent = 'Download Trimmed Audio';
  document.body.appendChild(a);
});

// helper function
function bufferToWave(abuffer, len) {
  const numOfChan = abuffer.numberOfChannels,
    length = len * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [],
    sampleRate = abuffer.sampleRate;
  let offset = 0,
    pos = 0;

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < numOfChan; i++)
    channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
