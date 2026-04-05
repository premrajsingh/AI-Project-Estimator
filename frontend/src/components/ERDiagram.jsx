import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  er: {
    useMaxWidth: true,
    layoutDirection: 'TB',
  },
  themeVariables: {
    primaryColor: '#6366f1',
    lineColor: '#818cf8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
  }
});

const ERDiagram = ({ chart }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chart) return;

    const renderChart = async () => {
      try {
        const id = `mermaid-svg-${Math.random().toString(36).slice(2, 11)}`;
        // Clean up the chart string (AI sometimes adds markdown backticks or ignores erDiagram header)
        let cleanChart = chart.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        
        // Find actual start of diagram (ignore AI prose before it)
        const startIndex = cleanChart.indexOf('erDiagram');
        if (startIndex !== -1) {
          cleanChart = cleanChart.substring(startIndex);
        } else if (!cleanChart.startsWith('erDiagram')) {
          cleanChart = `erDiagram\n${cleanChart}`;
        }
        
        const { svg: generatedSvg } = await mermaid.render(id, cleanChart);
        setSvg(generatedSvg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError('Could not render ER Diagram. The AI generated an invalid schema.');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono">
        {error}
      </div>
    );
  }

  if (!svg && chart) {
    return (
      <div className="p-12 w-full flex items-center justify-center animate-pulse bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="mermaid-render w-full overflow-x-auto flex justify-center p-8 bg-[#020617] rounded-2xl border border-slate-800 shadow-2xl"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default ERDiagram;
