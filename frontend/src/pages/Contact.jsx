import React, { useState } from 'react';
import API from '../utils/api';

const Contact = () => {
  const [messageSent, setMessageSent] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitContact = async (event, kind) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    try {
      await API.post('/contact', {
        kind,
        name: formData.get('name'),
        email: formData.get('email') || '',
        phone: formData.get('phone') || '',
        subject: formData.get('subject') || '',
        rating: formData.get('rating') || undefined,
        message: formData.get('message')
      });
      if (kind === 'message') setMessageSent(true);
      if (kind === 'feedback') setFeedbackSent(true);
      form.reset();
    } catch (error) {
      console.error('Contact submission failed:', error);
      alert('Unable to save your submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <section>
          <p className="text-sm font-bold uppercase tracking-widest text-bakery-red">Visit Us</p>
          <h1 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">Contact SR Bakery</h1>
          <div className="mt-6 space-y-4 text-gray-300">
            <p className="leading-7">
              233/1A1, Ground Floor, Dindigul-Palani Road, Oddanchatram, Dindigul - 624619.
            </p>
            <p>Phone: 9944019497</p>
            <p>Email: gopilion47@gmail.com</p>
          </div>
          <div className="mt-8 rounded-lg border border-red-900/50 bg-black/55 p-5">
            <h2 className="text-lg font-extrabold text-white">Open for Orders</h2>
            <p className="mt-2 leading-7 text-gray-300">
              Send your cake orders, party snack requests or general questions. Our team will get back
              to you as soon as possible.
            </p>
          </div>
        </section>

        <section className="grid gap-6">
          <form onSubmit={(event) => submitContact(event, 'message')} className="grid grid-cols-1 gap-4 rounded-lg border border-red-900/50 bg-black/55 p-5">
            <h2 className="text-xl font-extrabold text-white">Message Us</h2>
            <input name="name" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Your name" required />
            <input name="email" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Email" type="email" required />
            <input name="phone" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Phone" />
            <input name="subject" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Subject" required />
            <textarea name="message" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Message" rows="4" required />
            {messageSent && (
              <p className="rounded border border-green-700 bg-green-950/60 px-3 py-2 text-sm text-green-200">
                Your message has been saved. We will contact you soon.
              </p>
            )}
            <button disabled={submitting} className="rounded bg-bakery-red px-4 py-3 font-bold text-white disabled:opacity-60">Send Message</button>
          </form>

          <form onSubmit={(event) => submitContact(event, 'feedback')} className="grid grid-cols-1 gap-4 rounded-lg border border-red-900/50 bg-black/55 p-5">
            <h2 className="text-xl font-extrabold text-white">Feedback</h2>
            <input name="name" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Your name" required />
            <select name="rating" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" defaultValue="5">
              <option value="5">5 stars - Excellent</option>
              <option value="4">4 stars - Good</option>
              <option value="3">3 stars - Average</option>
              <option value="2">2 stars - Needs improvement</option>
              <option value="1">1 star - Poor</option>
            </select>
            <textarea name="message" className="rounded border border-gray-700 bg-gray-900 p-3 text-white" placeholder="Share your feedback" rows="4" required />
            {feedbackSent && (
              <p className="rounded border border-green-700 bg-green-950/60 px-3 py-2 text-sm text-green-200">
                Thank you for your feedback. It has been saved.
              </p>
            )}
            <button disabled={submitting} className="rounded bg-bakery-red px-4 py-3 font-bold text-white disabled:opacity-60">Submit Feedback</button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Contact;
