'use strict';
const site = require('../config/site');
const { pkr, formatPhone, formatDate, formatTime12 } = require('./validate');

const waLink = (message) => `https://wa.me/${site.contact.whatsappNumber}${message ? '?text=' + encodeURIComponent(message) : ''}`;

/** WhatsApp message for a placed order. */
function orderMessage(order, methodName) {
  const items = order.items.map((i) => `• ${i.product_name} — ${i.variant_label} × ${i.quantity} = ${pkr(i.line_total)}`).join('\n');
  const weights = order.items.filter((i) => i.weight_lbs).map((i) => `${i.product_name}: ${i.variant_label}`).join(', ');
  const address = order.fulfillment === 'pickup'
    ? 'Pickup'
    : [order.address, order.area, order.city, order.province].filter(Boolean).join(', ') + (order.landmark ? ` (${/^near\b/i.test(order.landmark) ? order.landmark : 'Near ' + order.landmark})` : '');
  return [
    'Hello Sohni Bakers,',
    '',
    'I would like to place an order.',
    '',
    `Order No: ${order.order_number}`,
    `Product:\n${items}`,
    `Cake Weight: ${weights || '—'}`,
    `Quantity: ${order.items.reduce((s, i) => s + i.quantity, 0)} item(s)`,
    `Total Amount: ${pkr(order.grand_total)}`,
    `${order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'} Date: ${formatDate(order.delivery_date)}`,
    `${order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'} Time: ${formatTime12(order.delivery_time)}`,
    `Delivery Address: ${address}`,
    `Payment Method: ${methodName}${order.payment && order.payment.transaction_id ? ` (TID: ${order.payment.transaction_id})` : ''}`,
    '',
    `Customer Name: ${order.customer_name}`,
    `Mobile Number: ${formatPhone(order.phone)}`,
    '',
    'Please confirm my order.',
  ].join('\n');
}

module.exports = { waLink, orderMessage };
