import { useState, useEffect } from 'react';


function Gate() {
  const [ htmlContent, setHtmlContent ] = useState('');
  const [ userCount, setUserCount ] = useState(1);

  useEffect(() => {
    fetch('/pixel/gate.html')
      .then((res) => res.text())
      .then((data) => setHtmlContent(data))
      .catch((err) => console.error('HTML 로드 실패:', err));
  }, []);

  return (
    <>
      <main className='main'>
        <div className='gate-pixel-wrap' dangerouslySetInnerHTML={{ __html: htmlContent }} />

        <h1>Frog Race Game</h1>

        <section className='user-section'>
          <div className="row">
            <div className="col">
              <label htmlFor="userNum">참가자 수: </label>
            </div>
            <div className="col">
              <select 
                id="userNum"
                onChange={(e) => setUserCount(Number(e.target.value))}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <option key={i} value={i + 2}>
                    {i + 2}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {userCount > 1 && Array.from({ length: userCount }, (_, i) => (
            <div className="row users" key={i}>
              <div className="col">
                <label htmlFor={`user-${i}`}>Name {i + 1} :</label>
              </div>
              <div className="col">
                <input type="text" id={`user-${i}`} />
              </div>
            </div>
          ))}
        </section>

        
      </main>
    </>
  )
}

export default Gate;
