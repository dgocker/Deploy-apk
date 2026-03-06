import React, { useState } from 'react';

export function PushTestPage() {
  const [userId, setUserId] = useState('2');
  const [logs, setLogs] = useState<string[]>([]);

  const sendPush = async (type: string) => {
    try {
      setLogs(prev => [...prev, `Sending ${type}...`]);
      const res = await fetch('/api/debug/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type })
      });
      const data = await res.json();
      setLogs(prev => [...prev, `Result: ${JSON.stringify(data)}`]);
    } catch (e) {
      setLogs(prev => [...prev, `Error: ${e}`]);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Push Notification Tester</h1>
      
      <div className="flex gap-2 items-center">
        <label>Target User ID:</label>
        <input 
          value={userId} 
          onChange={e => setUserId(e.target.value)}
          className="border p-2 rounded w-full text-black"
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button onClick={() => sendPush('standard')} className="bg-blue-500 text-white p-3 rounded">
          1. Standard Notification (Title+Body)
        </button>
        <button onClick={() => sendPush('data_only')} className="bg-gray-500 text-white p-3 rounded">
          2. Data Only (Silent)
        </button>
        <button onClick={() => sendPush('call_full_screen')} className="bg-red-500 text-white p-3 rounded">
          3. Call (Data Only - Service FSI)
        </button>
        <button onClick={() => sendPush('call_notification')} className="bg-green-500 text-white p-3 rounded">
          4. Call (Standard Notification)
        </button>
      </div>

      <div className="bg-black text-white p-4 rounded h-64 overflow-auto font-mono text-xs">
        {logs.map((log, i) => <div key={i} className="border-b border-gray-700 py-1">{log}</div>)}
      </div>
    </div>
  );
}
