import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare } from 'lucide-react';

const WhatsAppButton = () => {
  const { t } = useContext(AuthContext);
  const phoneNumber = '919944019497';
  const message = 'Hello SR Bakery, I would like to inquire about ordering delicious cakes and snacks!';

  const handleClick = () => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.6)] hover:scale-110 transition-all active:scale-95 group"
      aria-label="Contact on WhatsApp"
    >
      <MessageSquare className="w-6 h-6 animate-pulse" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm whitespace-nowrap">
        {t('whatsappFloating')}
      </span>
    </button>
  );
};

export default WhatsAppButton;
