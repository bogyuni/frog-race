import { useState } from 'react';
import mainImg from './assets/img/frog-main.webp';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <main className='main'>
        <img src={mainImg} alt="frog image" />
        <h1>Frog Race Game</h1>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </main>
    </>
  )
}

export default App;
