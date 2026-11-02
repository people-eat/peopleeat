// cspell:disable
import AppKit
import AVFoundation
import ScreenCaptureKit

final class WindowRecorder: NSObject, SCStreamOutput, @unchecked Sendable {
    let writer: AVAssetWriter
    let input: AVAssetWriterInput
    var started = false
    var frames = 0
    var firstTime: CMTime?
    var lastTime: CMTime?
    var firstFrameUnixSeconds: Double?

    init(path: String, width: Int, height: Int) throws {
        writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: path), fileType: .mov)
        input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 16_000_000,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoMaxKeyFrameIntervalKey: 60,
            ],
        ])
        input.expectsMediaDataInRealTime = true
        writer.add(input)
        super.init()
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, sampleBuffer.isValid,
              let attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let rawStatus = attachments.first?[.status] as? Int,
              SCFrameStatus(rawValue: rawStatus) == .complete else { return }
        let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        if !started {
            writer.startWriting()
            writer.startSession(atSourceTime: time)
            firstTime = time
            firstFrameUnixSeconds = Date().timeIntervalSince1970
            started = true
        }
        if input.isReadyForMoreMediaData {
            if input.append(sampleBuffer) {
                frames += 1
                lastTime = time
            }
        }
    }
}

@main
struct CaptureWindow {
    @MainActor
    static func main() async throws {
        _ = NSApplication.shared
        let arguments = CommandLine.arguments
        let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
        let windows = content.windows.filter {
            $0.owningApplication?.bundleIdentifier == "com.google.Chrome" && $0.frame.width > 800
        }
        guard let window = windows.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else {
            throw NSError(domain: "CaptureWindow", code: 1, userInfo: [NSLocalizedDescriptionKey: "No visible Chrome window"])
        }
        if arguments.count < 2 {
            print("Chrome window \(window.windowID): \(window.frame), \(window.title ?? "")")
            return
        }
        let path = arguments[1]
        let stopPath = arguments.count > 2 ? arguments[2] : path + ".stop"
        let portrait = arguments.count >= 7
        let width = portrait ? 1180 : Int(window.frame.width) / 2 * 2
        let height = portrait ? 2556 : Int(window.frame.height) / 2 * 2
        let configuration = SCStreamConfiguration()
        configuration.width = width
        configuration.height = height
        if portrait {
            configuration.scalesToFit = true
            configuration.destinationRect = CGRect(x: 0, y: 0, width: width, height: height)
            configuration.sourceRect = CGRect(
                x: Double(arguments[3])!, y: Double(arguments[4])!,
                width: Double(arguments[5])!, height: Double(arguments[6])!
            )
        }
        configuration.minimumFrameInterval = CMTime(value: 1, timescale: 60)
        configuration.queueDepth = 8
        configuration.showsCursor = false
        configuration.capturesAudio = false
        configuration.pixelFormat = kCVPixelFormatType_32BGRA
        let recorder = try WindowRecorder(path: path, width: width, height: height)
        let stream = SCStream(filter: SCContentFilter(desktopIndependentWindow: window), configuration: configuration, delegate: nil)
        let queue = DispatchQueue(label: "peopleeat.window.capture")
        try stream.addStreamOutput(recorder, type: .screen, sampleHandlerQueue: queue)
        try await stream.startCapture()
        print("RECORDING \(path) \(width)x\(height)")
        fflush(stdout)
        while !FileManager.default.fileExists(atPath: stopPath) {
            try await Task.sleep(for: .milliseconds(100))
        }
        try await stream.stopCapture()
        await withCheckedContinuation { continuation in
            queue.async {
                recorder.input.markAsFinished()
                recorder.writer.finishWriting { continuation.resume() }
            }
        }
        let duration = CMTimeGetSeconds(CMTimeSubtract(recorder.lastTime ?? .zero, recorder.firstTime ?? .zero))
        print("FINISHED frames=\(recorder.frames) seconds=\(duration) status=\(recorder.writer.status.rawValue)")
        let metadata: [String: Any] = [
            "firstFrameUnixSeconds": recorder.firstFrameUnixSeconds ?? 0,
            "durationSeconds": duration, "frames": recorder.frames,
            "width": width, "height": height, "requestedFramesPerSecond": 60,
            "cursorVisible": false,
        ]
        try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted, .sortedKeys])
            .write(to: URL(fileURLWithPath: path + ".json"))
        if let error = recorder.writer.error { throw error }
    }
}
