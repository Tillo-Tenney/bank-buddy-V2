// import { useState, useEffect } from 'react';

// export const useSession = () => {
//   const [sessionId, setSessionId] = useState<string>('');
//   const [sessionCreatedAt, setSessionCreatedAt] = useState<Date | null>(null);

//   useEffect(() => {
//     const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
//     setSessionId(id);
//     setSessionCreatedAt(new Date());
//   }, []);

//   const clearSession = () => {
//     const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
//     setSessionId(newId);
//     setSessionCreatedAt(new Date());
//   };

//   const getTimeRemaining = () => {
//     if (!sessionCreatedAt) return 60;
//     const elapsed = (Date.now() - sessionCreatedAt.getTime()) / 1000 / 60;
//     return Math.max(0, Math.ceil(60 - elapsed));
//   };

//   return { sessionId, sessionCreatedAt, clearSession, getTimeRemaining };
// };




import { useState, useEffect } from 'react';

export const useSession = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionCreatedAt, setSessionCreatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setSessionId(id);
    setSessionCreatedAt(new Date());
  }, []);

  const clearSession = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setSessionId(newId);
    setSessionCreatedAt(new Date());
  };

  const getTimeRemaining = () => {
    if (!sessionCreatedAt) return 60;
    const elapsed = (Date.now() - sessionCreatedAt.getTime()) / 1000 / 60;
    return Math.max(0, Math.ceil(60 - elapsed));
  };

  return { sessionId, sessionCreatedAt, clearSession, getTimeRemaining };
};