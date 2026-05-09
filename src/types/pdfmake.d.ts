// Minimal pdfmake type declarations (rasmiy paketda types yo'q)

declare module 'pdfmake' {
  import type { TDocumentDefinitions, BufferOptions, TFontDictionary } from 'pdfmake/interfaces';

  interface PDFKitDocument extends NodeJS.ReadableStream {
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
    end(): void;
  }

  class PdfPrinter {
    constructor(fontDescriptors: TFontDictionary);
    createPdfKitDocument(
      docDefinition: TDocumentDefinitions,
      options?: BufferOptions,
    ): PDFKitDocument;
  }

  export default PdfPrinter;
}

declare module 'pdfmake/interfaces' {
  export type Margins = number | [number, number] | [number, number, number, number];
  export type Alignment = 'left' | 'right' | 'center' | 'justify';
  export type PageOrientation = 'portrait' | 'landscape';
  export type PageSize = string | { width: number; height: number };

  export interface Style {
    font?: string;
    fontSize?: number;
    fontFeatures?: string[];
    lineHeight?: number;
    bold?: boolean;
    italics?: boolean;
    alignment?: Alignment;
    color?: string;
    columnGap?: number;
    fillColor?: string;
    decoration?: string;
    decorationStyle?: string;
    decorationColor?: string;
    background?: string;
    margin?: Margins;
    [key: string]: unknown;
  }

  export interface ContentBase extends Style {
    style?: string | string[];
    pageBreak?: 'before' | 'after';
    pageOrientation?: PageOrientation;
    width?: number | string;
    height?: number;
    fit?: [number, number];
    margin?: Margins;
    absolutePosition?: { x: number; y: number };
    relativePosition?: { x: number; y: number };
  }

  export type Content =
    | string
    | (ContentBase & { text: string | Content[] | (string | Content)[] })
    | (ContentBase & { stack: Content[] })
    | (ContentBase & { columns: Content[] })
    | (ContentBase & { ul: (string | Content)[] })
    | (ContentBase & { ol: (string | Content)[] })
    | (ContentBase & { table: { widths?: (number | string)[]; body: Content[][] }; layout?: string | Record<string, unknown> })
    | (ContentBase & { image: string; cover?: { width: number; height: number; valign?: string; align?: string } })
    | (ContentBase & { svg: string })
    | (ContentBase & { canvas: Array<Record<string, unknown>> })
    | (ContentBase & { qr: string })
    | (ContentBase & Record<string, unknown>);

  export interface TFontDictionary {
    [fontName: string]: {
      normal?: string | Buffer;
      bold?: string | Buffer;
      italics?: string | Buffer;
      bolditalics?: string | Buffer;
    };
  }

  export interface BufferOptions {
    tableLayouts?: Record<string, unknown>;
    fontLayoutCache?: boolean;
  }

  export type DynamicContent = (
    currentPage: number,
    pageCount: number,
    pageSize?: { width: number; height: number },
  ) => Content | Content[] | undefined;

  export interface TDocumentDefinitions {
    pageSize?: PageSize;
    pageOrientation?: PageOrientation;
    pageMargins?: Margins;
    content: Content | Content[];
    header?: Content | Content[] | DynamicContent;
    footer?: Content | Content[] | DynamicContent;
    background?: Content | Content[] | DynamicContent;
    defaultStyle?: Style;
    styles?: Record<string, Style>;
    images?: Record<string, string>;
    info?: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
      creator?: string;
      producer?: string;
      creationDate?: Date;
      modDate?: Date;
    };
    [key: string]: unknown;
  }
}

// `import ... from 'pdfmake/interfaces.js'` formati uchun ham
declare module 'pdfmake/interfaces.js' {
  export * from 'pdfmake/interfaces';
}
