declare module "qrcode.react" {
  interface QRCodeSVGProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: "L" | "M" | "Q" | "H";
    includeMargin?: boolean;
    title?: string;
  }
  export const QRCodeSVG: React.FC<QRCodeSVGProps>;
}
