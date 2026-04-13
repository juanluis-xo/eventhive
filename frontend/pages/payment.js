import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, CreditCard as DebitCard, Wallet, ArrowLeft, Loader2, CheckCircle, Shield, Lock } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';

export default function Payment() {
  const router = useRouter();
  const { eventId, price, title } = router.query;
  const [method, setMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handlePayment = async (details = null) => {
    setLoading(true);
    try {
      // 1. Process Payment in Payment Service
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventId: parseInt(eventId),
          amount: parseFloat(price),
          method: method,
          paypalDetails: details
        }),
      });

      if (!paymentResponse.ok) throw new Error('Error al procesar el pago');
      
      // 2. Create Ticket in Ticket Service
      const ticketResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventId: parseInt(eventId)
        }),
      });

      if (!ticketResponse.ok) throw new Error('Error al generar el ticket');

      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !eventId) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href={`/detalle-evento?id=${eventId}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 mb-8 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          Volver al evento
        </Link>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Sidebar info */}
            <div className="md:col-span-2 bg-slate-900 p-8 text-white">
              <h2 className="text-2xl font-black mb-6 tracking-tight">Resumen de Compra</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Evento</p>
                  <p className="font-bold text-lg leading-tight">{title}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total a pagar</p>
                  <p className="text-3xl font-black text-primary-400">
                    {Number(price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Shield className="w-5 h-5 text-primary-500" />
                    <span>Pago 100% Seguro</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Lock className="w-5 h-5 text-primary-500" />
                    <span>Datos Encriptados</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="md:col-span-3 p-8 md:p-12">
              {success ? (
                <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">¡Pago Exitoso!</h2>
                  <p className="text-slate-500 font-medium">Tu ticket ha sido generado correctamente. Redirigiendo a tu dashboard...</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Método de Pago</h2>
                  
                  <div className="space-y-4 mb-10">
                    <button
                      onClick={() => setMethod('credit_card')}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                        method === 'credit_card' ? 'border-primary-600 bg-primary-50/50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${method === 'credit_card' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-slate-700">Tarjeta de Crédito</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${method === 'credit_card' ? 'border-primary-600' : 'border-slate-200'}`}>
                        {method === 'credit_card' && <div className="w-3 h-3 bg-primary-600 rounded-full" />}
                      </div>
                    </button>

                    <button
                      onClick={() => setMethod('debit_card')}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                        method === 'debit_card' ? 'border-primary-600 bg-primary-50/50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${method === 'debit_card' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <DebitCard className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-slate-700">Tarjeta de Débito</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${method === 'debit_card' ? 'border-primary-600' : 'border-slate-200'}`}>
                        {method === 'debit_card' && <div className="w-3 h-3 bg-primary-600 rounded-full" />}
                      </div>
                    </button>

                    <button
                      onClick={() => setMethod('paypal')}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                        method === 'paypal' ? 'border-primary-600 bg-primary-50/50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${method === 'paypal' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Wallet className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-slate-700">PayPal</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${method === 'paypal' ? 'border-primary-600' : 'border-slate-200'}`}>
                        {method === 'paypal' && <div className="w-3 h-3 bg-primary-600 rounded-full" />}
                      </div>
                    </button>
                  </div>

                  {method === 'paypal' ? (
                    <PayPalButtons
                      style={{ layout: "vertical", shape: "pill" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          purchase_units: [
                            {
                              amount: {
                                value: price ? price.toString() : "0",
                              },
                            },
                          ],
                        });
                      }}
                      onApprove={(data, actions) => {
                        return actions.order.capture().then((details) => {
                          handlePayment(details);
                        });
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => handlePayment()}
                      disabled={loading}
                      className="w-full btn-primary py-5 rounded-2xl text-lg font-black shadow-xl shadow-primary-600/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Procesando Pago...
                        </>
                      ) : (
                        <>Confirmar y Pagar</>
                      )}
                    </button>
                  )}
                  
                  <p className="text-center text-slate-400 text-xs mt-6 font-medium">
                    Al confirmar el pago, aceptas nuestros términos y condiciones.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
