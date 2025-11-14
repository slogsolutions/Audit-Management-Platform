import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function StackedBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="credits" stackId="a" fill="#10b981" />
        <Bar dataKey="debits" stackId="a" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}
