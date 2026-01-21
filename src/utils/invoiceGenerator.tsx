import React from 'react';

export interface InvoiceData {
  riderName: string;
  riderPhone: string;
  riderEmail: string;
  riderAddress: string;
  tripType: string;
  gstNumber: string;
  invoiceNumber: string;
  date: string;
  totalPayable: number;
  beforeTripPay: number;
  totalGst: number;
  discountAmount: number;
  pickupDateTime: string;
  driverAcceptedTime: string;
  reachedTime: string;
  tripStarted: string;
  tripEnd: string;
}

const logoPlaceholder = "/Logo.png";

export function generateInvoice(invoiceData: InvoiceData) {
  const subtotal = invoiceData.beforeTripPay;
  const total = invoiceData.totalPayable;

  return (
    <div
      className="bg-gray-50 p-5 invoice-page"
      style={{ pageBreakInside: "avoid" }}
    >
      <div className="max-w-4xl mx-auto my-8 bg-white p-8 md:p-10 border border-gray-200 rounded-lg shadow-sm">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
          <div className="flex-1 min-w-[300px]">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Hire4Drive
            </h2>
            <address className="not-italic text-sm leading-relaxed text-gray-700">
              <strong className="block mb-1">Address</strong>
              #1747, 1st Floor, 3rd Cross 3rd Block, Vishwapriya Nagar,<br />
              Begur, Bengaluru, Karnataka 560068<br />
              Phone: 88848 48098<br />
              Email: support@hire4drive.com<br />
              Website: www.hire4drive.com
            </address>
          </div>
          <div className="text-right">
            <img src={logoPlaceholder} alt="Hire4Drive Logo" className="max-h-20" />
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Bill To & Invoice Info */}
        <div className="flex flex-wrap justify-between mb-8 gap-6">
          <div className="flex-1 min-w-[300px]">
            <h4 className="text-lg font-semibold mb-3 text-gray-800">Bill To:</h4>
            <p className="text-sm leading-relaxed text-gray-700">
              {invoiceData.riderName}<br />
              {invoiceData.riderPhone}<br />
              {invoiceData.riderAddress}<br />
              
            </p>
          </div>
          <div className="text-right min-w-[200px]">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-gray-700">Invoice #:</span>
              <span className="text-gray-700">{invoiceData.invoiceNumber}</span>
            </div>

            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-gray-700">Date:</span>
              <span className="text-gray-700">{invoiceData.date}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Trip Type:</span>
              <span className="text-gray-700">{invoiceData.tripType}</span>
            </div>
          </div>

        </div>

        {/* Trip Timeline Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Booking Date
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Reached
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Started
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Ended
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  {invoiceData.pickupDateTime}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  {invoiceData.reachedTime}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  {invoiceData.tripStarted}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  {invoiceData.tripEnd}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Item Details Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Item
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Description
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Qty
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Unit Price
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  GST
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Total Price
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">1</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  {invoiceData.tripType}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">1</td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  ₹{subtotal.toFixed(1)}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  ₹{invoiceData.totalGst.toFixed(1)}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                  ₹{total.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fare Summary */}
        <div className="flex justify-end mb-6">
          <div className="w-full max-w-sm">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-3 font-semibold text-gray-700">Subtotal</td>
                  <td className="py-2 px-3 text-right text-gray-700">₹{subtotal.toFixed(1)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-3 font-semibold text-gray-700">GST</td>
                  <td className="py-2 px-3 text-right text-gray-700">₹{invoiceData.totalGst.toFixed(1)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 px-3 font-semibold text-gray-700">Discount</td>
                  <td className="py-2 px-3 text-right text-gray-700">- ₹{invoiceData.discountAmount.toFixed(1)}</td>
                </tr>
                <tr className="border-t-2 border-gray-400 bg-blue-50">
                  <td className="py-2 px-3 font-bold text-gray-900">Total</td>
                  <td className="py-2 px-3 text-right font-bold text-gray-900">₹{total.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-600 leading-relaxed mt-8">
          Note: This invoice does not require a signature or seal.<br />
          <strong className="text-gray-800">LNS TECHNOLOGY SOLUTIONS</strong>
        </p>
      </div>
    </div>
  );
}