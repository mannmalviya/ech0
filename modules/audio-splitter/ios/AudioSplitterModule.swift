import AVFoundation
import ExpoModulesCore

// Cuts a long audio file into parts, so each part fits OpenAI's limits
// (25 minutes for the gpt-* models, 25 MB for all models).
public final class AudioSplitterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioSplitter")

    // Writes parts of at most `partSeconds` seconds as .m4a (AAC) files into `outputDir`,
    // and returns their file URLs in order. Works with any audio file that iOS can read (m4a, mp3, wav, ...).
    AsyncFunction("split") { (source: URL, outputDir: URL, partSeconds: Double) -> [String] in
      let input = try AVAudioFile(forReading: source)
      let format = input.processingFormat
      let framesPerPart = AVAudioFramePosition(partSeconds * format.sampleRate)
      // At most 64 kbps per channel: a 20-minute stereo part is about 19 MB, under the 25 MB limit.
      let bitRatePerChannel = min(64_000, Int(format.sampleRate) * 4)
      let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: format.sampleRate,
        AVNumberOfChannelsKey: format.channelCount,
        AVEncoderBitRateKey: bitRatePerChannel * Int(format.channelCount),
      ]
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 32_768) else {
        throw Exception(name: "BufferError", description: "Could not make an audio buffer.")
      }
      try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

      var parts: [String] = []
      while input.framePosition < input.length {
        let url = outputDir.appendingPathComponent("part-\(parts.count).m4a")
        try? FileManager.default.removeItem(at: url)
        let written = try writePart(from: input, to: url, frames: framesPerPart, settings: settings, buffer: buffer)
        if written == 0 {
          // The file said it was longer than the audio it had.
          try? FileManager.default.removeItem(at: url)
          break
        }
        parts.append(url.absoluteString)
      }
      return parts
    }
  }
}

// Copies the next `frames` frames of `input` into a new file at `url`, and returns how many it wrote.
// The new file is finished when this function returns, because `output` is released then.
private func writePart(
  from input: AVAudioFile,
  to url: URL,
  frames: AVAudioFramePosition,
  settings: [String: Any],
  buffer: AVAudioPCMBuffer
) throws -> AVAudioFramePosition {
  let format = input.processingFormat
  let output = try AVAudioFile(
    forWriting: url, settings: settings, commonFormat: format.commonFormat, interleaved: format.isInterleaved)
  let end = min(input.framePosition + frames, input.length)
  var written: AVAudioFramePosition = 0
  while input.framePosition < end {
    let count = AVAudioFrameCount(min(AVAudioFramePosition(buffer.frameCapacity), end - input.framePosition))
    try input.read(into: buffer, frameCount: count)
    if buffer.frameLength == 0 { break }
    try output.write(from: buffer)
    written += AVAudioFramePosition(buffer.frameLength)
  }
  return written
}
