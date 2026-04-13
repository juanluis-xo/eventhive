import '@/styles/globals.css';
import Layout from '@/components/Layout';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

export default function App({ Component, pageProps }) {
  return (
    <PayPalScriptProvider options={{ "client-id": "Aeyh35v8ZW6CLL61RTfWdRTXodza-_8Bczz2gd2XDOQ3Ue6KT8DYq9wk3dZ3pE00ZzqZIdHaBuIgvovH" }}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </PayPalScriptProvider>
  );
}
