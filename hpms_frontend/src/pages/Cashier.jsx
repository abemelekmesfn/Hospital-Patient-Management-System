import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Styles/cashier.css";

export default function Cashier() {

  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    const res = await API.get("/billing/queue/");
    setQueue(res.data);
  };

  const loadInvoice = async (id) => {
    const res = await API.get(`/billing/invoice/${id}/`);
    setSelected(res.data);
  };

  const processPayment = async (method) => {

    await API.post(`/billing/pay/${selected.id}/`, {
      payment_method: method
    });

    alert("Payment Processed");

    fetchQueue();
    setSelected(null);
  };

  return (
    <div className="cashier-container">

      {/* LEFT */}
      <div className="cashier-left">

        <h3>Billing Queue</h3>

        {queue.map((invoice) => (
          <div
            key={invoice.id}
            className="billing-card"
            onClick={() => loadInvoice(invoice.id)}
          >
            <h4>{invoice.patient_name}</h4>

            <p>{invoice.hospital_id}</p>

            <strong>${invoice.total}</strong>
          </div>
        ))}

      </div>

      {/* RIGHT */}
      <div className="cashier-right">

        {!selected ? (
          <p>Select patient invoice</p>
        ) : (
          <>
            <div className="invoice-paper">

              <h2>DOSE Hospital Invoice</h2>

              <table>

                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Department</th>
                    <th>Cost</th>
                  </tr>
                </thead>

                <tbody>

                  {selected.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.service_name}</td>
                      <td>{item.department}</td>
                      <td>${item.cost}</td>
                    </tr>
                  ))}

                </tbody>

              </table>

              <div className="totals">

                <p>Subtotal: ${selected.subtotal}</p>

                <p>
                  Insurance:
                  -${selected.insurance_discount}
                </p>

                <h1>
                  Total: ${selected.total}
                </h1>

              </div>

              {/* PAYMENT METHODS */}

              <div className="payment-buttons">

                <button
                  onClick={() => processPayment("CASH")}
                >
                  💵 Cash
                </button>

                <button
                  onClick={() => processPayment("CARD")}
                >
                  💳 Card
                </button>

                <button
                  onClick={() => processPayment("MOBILE")}
                >
                  📱 Mobile Money
                </button>

              </div>

            </div>
          </>
        )}

      </div>

    </div>
  );
}