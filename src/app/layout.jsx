import "./globals.css";

export const metadata = {
  title: "Music Avatar Studio",
  description: "Formative Study — Movement-Music Mapping",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
