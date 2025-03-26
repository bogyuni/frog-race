import { useState, useEffect } from 'react';


function Race() {
  const [users, setUsers] = useState<{ name: string; frog: string }[]>([]);

  useEffect(() => {
    try {
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        setUsers(storedUsers);
        console.log('경기 참가자 목록:', storedUsers);
    } catch (error) {
      console.error('사용자 정보를 불러오는 중 오류 발생:', error);
    }
  }, []);
  return (
    <main className="race">
      <h1>🐸 Frog Race! 🏁</h1>
      <p>콘솔에서 참가자 정보를 확인하세요!</p>
    </main>
  );
}

export default Race;
