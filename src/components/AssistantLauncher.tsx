import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';

const AssistantLauncher = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === '/login' || pathname.startsWith('/assistant')) return null;

  return (
    <button
      type="button"
      className="assistant-launcher"
      onClick={() => navigate('/assistant')}
      aria-label="Buka Asisten Sarmok"
      title="Buka Asisten Sarmok"
    >
      <span className="assistant-launcher__icon" aria-hidden="true">
        <MessageSquareText size={20} />
      </span>
      <span className="assistant-launcher__text">
        Chat Asisten
      </span>
    </button>
  );
};

export default AssistantLauncher;
