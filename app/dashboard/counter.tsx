"use client";

import { useState } from "react";

// Client Component — needs "use client" because it uses state + event handlers
export default function Counter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  return (
    <button onClick={() => setCount(count + 1)}>
      clicked {count} times
    </button>
  );
}
