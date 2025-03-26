import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 브라우저 히스토리 관리

function Gate() {
  const navigate = useNavigate();

  const [htmlContent, setHtmlContent] = useState('');

  // 참가자 정보, 상태
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<{ name: string; frog: string }[]>(() => {
    try {
      const storedUsers = localStorage.getItem('users');
      return storedUsers ? JSON.parse(storedUsers) : [];
    } catch {
      return [];
    }
  });
  
  const [step, setStep] = useState(0); // 0: 참가자 입력, 1~N: 개구리 선택 단계

  // 참가자 수 변경 시 초기화
  const handleUserCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = Number(e.target.value);
    setUserCount(count);

    // 🚀 상태 업데이트를 useEffect에서 실행하도록 수정!
    setUsers((prevUsers) => {
      const newUsers = Array.from({ length: count }, (_, i) => ({
        name: prevUsers[i]?.name || '',
        frog: prevUsers[i]?.frog || '',
      }));
      return newUsers;
    });
  };

  // 이름 입력 핸들러
  const handleNameChange = (index: number, value: string) => {
    const newUsers = [...users];
    newUsers[index].name = value;
    setUsers(newUsers);
  };

  // 참가자 정보 저장 & 다음 단계 이동
  const handleNext = () => {
    localStorage.setItem('users', JSON.stringify(users));
    setStep((prevStep) => prevStep + 1); // navigate()는 useEffect에서 처리
  };
  

  // 이전 단계로 이동
  const handlePrev = () => {
    setStep((prevStep) => prevStep - 1);
  };

  useEffect(() => {
    fetch('/pixel/gate.html')
      .then((res) => res.text())
      .then((data) => setHtmlContent(data))
      .catch((err) => console.error('HTML 로드 실패:', err));
  }, []);

  useEffect(() => {
    if (step > 0) {
      navigate(step === userCount ? '/race' : `/frog-selection/${step}`);
    }
  }, [step, navigate, userCount]);
  
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);
  


  return (
    <main className='gate'>
      {/* 참가자 입력 단계 */}
      {step === 0 ? (
        <section className='user-selection'>
          <div className='gate-pixel-wrap' dangerouslySetInnerHTML={{ __html: htmlContent }} />
          <h1>Frog Race Game</h1>
          <div className="row">
            <div className="col">
              <label htmlFor="userNum">참가자 수: </label>
            </div>
            <div className="col">
            <select 
                id="userNum"
                onChange={handleUserCountChange}
                value={userCount}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <option key={i} value={i + 2}>
                    {i + 2}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {userCount > 0 && (
            <>
              {Array.from({ length: userCount }, (_, i) => (
                <div className="row users" key={i}>
                  <div className="col">
                    <label htmlFor={`user-${i}`}>Name {i + 1} :</label>
                  </div>
                  <div className="col">
                    <input 
                      type="text" 
                      id={`user-${i}`} 
                      value={users[i]?.name || ''}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <div className="row">
                <div className="col"></div>
                <div className="col">
                  <button onClick={handleNext}>NEXT</button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="frog-selection">
          {/* 개구리 선택 단계 */}
          <h1>{users[step - 1]?.name}님, 개구리를 선택하세요!</h1>
          <div className="row">
            {['청개구리', '비개구리', '두꺼비', '뿔개구리'].map((frog, index) => (
              <label key={index}>
                <input
                  type="radio"
                  name="frog"
                  value={frog}
                  checked={users[step - 1]?.frog === frog}
                  onChange={(e) => {
                    const newUsers = [...users];
                    newUsers[step - 1].frog = e.target.value;
                    setUsers(newUsers);
                    localStorage.setItem('users', JSON.stringify(newUsers));
                  }}
                />
                {frog}
              </label>
            ))}
          </div>

          <div className="row">
            {step > 1 && <button onClick={handlePrev}>Prev</button>}
            {step < userCount ? <button onClick={handleNext}>Next</button> : <button onClick={() => navigate('/race')}>게임 시작!</button>}
          </div>
        </section>
      )}
    </main>
  )
}

export default Gate;
