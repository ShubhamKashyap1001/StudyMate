declare module 'pdf-parse' {
  interface PDFMetadata {
    info?: Record<string, unknown>
    metadata?: any
    version?: string
  }

  interface PDFParseResult extends PDFMetadata {
    numpages: number
    numrender: number
    info?: Record<string, unknown>
    metadata?: any
    text: string
    version: string
  }

  function pdfParse(dataBuffer: Buffer | Uint8Array | ArrayBuffer, options?: Record<string, unknown>): Promise<PDFParseResult>
  export default pdfParse
}
