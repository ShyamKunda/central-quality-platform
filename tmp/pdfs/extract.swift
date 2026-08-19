import Foundation
import PDFKit
import AppKit

let input = CommandLine.arguments[1]
let outputDir = CommandLine.arguments[2]
guard let document = PDFDocument(url: URL(fileURLWithPath: input)) else {
    fatalError("Unable to open PDF")
}
print("pages \(document.pageCount)")
for index in 0..<document.pageCount {
    guard let page = document.page(at: index) else { continue }
    print("\n--- PAGE \(index + 1) ---\n")
    print(page.string ?? "")
    let bounds = page.bounds(for: .mediaBox)
    let scale: CGFloat = 1.5
    let size = NSSize(width: bounds.width * scale, height: bounds.height * scale)
    let image = NSImage(size: size)
    image.lockFocus()
    NSColor.white.setFill()
    NSRect(origin: .zero, size: size).fill()
    guard let context = NSGraphicsContext.current?.cgContext else { continue }
    context.saveGState()
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    image.unlockFocus()
    guard let data = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: data),
          let png = bitmap.representation(using: .png, properties: [:]) else { continue }
    let url = URL(fileURLWithPath: outputDir).appendingPathComponent("page-\(index + 1).png")
    try png.write(to: url)
}
