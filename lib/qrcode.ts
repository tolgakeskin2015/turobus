import QRCode from "qrcode";

export async function generateQRCode(text: string) {
  return await QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
  });
}
