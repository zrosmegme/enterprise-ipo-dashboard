import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import { Search, Filter, BarChart2, Activity } from 'lucide-react';
import { ENTERPRISE_IPO_DATA } from './data.js';

// ===========================
// UTILITY FUNCTIONS
// ===========================
const parseYearFilter = (input) => {
  if (!input || input.trim() === '') return null;
  
  const years = new Set();
  const parts = input.split(',').map(p => p.trim());
  
  parts.forEach(part => {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(y => y.trim());
      const start = startStr === '' ? 2010 : parseInt(startStr);
      const end = endStr === '' ? 2025 : parseInt(endStr);
      
      if (!isNaN(start) && !isNaN(end)) {
        for (let year = start; year <= end; year++) {
          years.add(year);
        }
      }
    } else {
      const year = parseInt(part);
      if (!isNaN(year)) {
        years.add(year);
      }
    }
  });
  
  return years.size > 0 ? years : null;
};

const getPerformanceIcon = (currentPrice, ipoPrice) => {
  const returnPct = ((currentPrice - ipoPrice) / ipoPrice) * 100;
  if (returnPct >= 100) return '🚀';
  if (returnPct >= 50) return '📈';
  if (returnPct >= 0) return '📊';
  return '📉';
};

const getStatusColor = (status) => {
  if (status === 'Public') return 'text-green-700';
  if (status.includes('Acquired')) return 'text-purple-700';
  if (status.includes('Merged')) return 'text-blue-700';
  if (status.includes('Delisted')) return 'text-red-700';
  if (status.includes('Re-IPO')) return 'text-orange-700';
  return 'text-gray-700';
};

// Axis formatting functions for scatter plot
const formatAxisValue = (value, fieldName) => {
  if (value === null || value === undefined || isNaN(value)) return '';
  
  // Percentage fields
  if (fieldName.includes('Pop') || fieldName.includes('Return') || fieldName.includes('Outperformance')) {
    return Math.round(value) + '%';
  }
  
  // Price fields
  if (fieldName.includes('Price')) {
    if (value >= 1000000) {
      return '$' + Math.round(value / 1000000) + 'M';
    } else if (value >= 1000) {
      return '$' + Math.round(value / 1000) + 'K';
    } else {
      return '$' + Math.round(value);
    }
  }
  
  // Year field
  if (fieldName === 'year') {
    return Math.round(value).toString();
  }
  
  // Default: round to whole number
  return Math.round(value).toString();
};

const getTagColor = (index) => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800'
  ];
  return colors[index % colors.length];
};

// ===========================
// UI COMPONENTS
// ===========================

const SummaryStats = ({ filteredIPOs }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    <div className="bg-white rounded-lg shadow-md p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">{filteredIPOs.length}</div>
      <div className="text-sm text-gray-500">Total IPOs</div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">
        {filteredIPOs.filter(ipo => ipo.status.includes('Acquired')).length}
      </div>
      <div className="text-sm text-gray-500">Acquired</div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">
        {filteredIPOs.filter(ipo => ipo.status === 'Public').length}
      </div>
      <div className="text-sm text-gray-500">Still Public</div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">
        {filteredIPOs.length > 0 ? (() => {
          const pops = filteredIPOs.map(ipo => ipo.firstDayPop).sort((a, b) => a - b);
          const mid = Math.floor(pops.length / 2);
          const median = pops.length % 2 === 0 ? (pops[mid - 1] + pops[mid]) / 2 : pops[mid];
          return Math.round(median);
        })() : 0}%
      </div>
      <div className="text-sm text-gray-500">Median First Day Pop</div>
    </div>
  </div>
);

const FilterControls = ({ 
  unifiedSearch, setUnifiedSearch,
  showSuggestions, setShowSuggestions,
  suggestions,
  viewType, setViewType
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
    <div className="grid md:grid-cols-2 gap-6">
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Search className="w-4 h-4 inline mr-1" />
          Search Anything
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Company, ticker, year, tag... (e.g., 'SNOW', '2020-2025', 'AI Security')"
            className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={unifiedSearch}
            onChange={(e) => {
              setUnifiedSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {unifiedSearch && (
            <div className="absolute right-2 top-3">
              <button
                onClick={() => setUnifiedSearch('')}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b">
              Suggestions
            </div>
            {suggestions.map((item, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setUnifiedSearch(item.value);
                  setShowSuggestions(false);
                }}
              >
                <span>{item.display}</span>
                <span className="text-xs text-gray-400">({item.type})</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          Examples: "SNOW" • "Snowflake" • "2020-2025" • "AI Security" • "2023"
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <BarChart2 className="w-4 h-4 inline mr-1" />
          View Type
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('table')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm ${viewType === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <Filter className="w-4 h-4" />
            Table
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm ${viewType === 'bar' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <BarChart2 className="w-4 h-4" />
            Bar
          </button>
          <button
            onClick={() => setViewType('scatter')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm ${viewType === 'scatter' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <Activity className="w-4 h-4" />
            Scatter
          </button>
        </div>
      </div>
    </div>
  </div>
);

const TableView = ({ filteredIPOs, sortField, sortDirection, setSortField, setSortDirection }) => {
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'desc' ? '↓' : '↑';
  };

  return (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">
        Enterprise Software IPO Database ({filteredIPOs.length} companies)
      </h3>
    </div>
    
    <div className="overflow-x-auto max-h-[750px]">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 w-[20%]"
              onClick={() => handleSort('company')}
            >
              Company {getSortIcon('company')}
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 w-[8%]"
              onClick={() => handleSort('year')}
            >
              IPO Year {getSortIcon('year')}
            </th>
            <th 
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 w-[18%]"
              onClick={() => handleSort('firstDayPop')}
            >
              <div>
                <div>IPO → Current/Acq Price</div>
                <div className="text-[10px] font-normal text-gray-400">(as of Sep 10, 2025)</div>
              </div>
              {getSortIcon('firstDayPop')}
            </th>
            <th 
              className={`px-3 py-2 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-100 w-[15%] ${
                sortField === 'year3AnnualizedReturn' ? 'bg-blue-100 text-blue-800' : 'text-gray-500'
              }`}
              onClick={() => handleSort('year3AnnualizedReturn')}
            >
              Returns from Day 1 After IPO {getSortIcon('year3AnnualizedReturn')}
            </th>
            <th 
              className={`px-3 py-2 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-100 w-[12%] ${
                sortField === 'year3Outperformance' ? 'bg-blue-100 text-blue-800' : 'text-gray-500'
              }`}
              onClick={() => handleSort('year3Outperformance')}
            >
              Returns from Day 1 After IPO vs. IGV Index {getSortIcon('year3Outperformance')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[22%]">Tags</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[5%]">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredIPOs.map((ipo, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900">{ipo.company}</div>
                  <div className="text-xs text-gray-500">{ipo.ticker}</div>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{ipo.year}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="mr-2">{getPerformanceIcon(ipo.currentPrice, ipo.ipoPrice)}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      ${ipo.ipoPrice} → {ipo.acquisitionPrice ? `$${ipo.acquisitionPrice} (acq)` : ipo.currentPrice ? `$${ipo.currentPrice}` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ipo.firstDayPop > 0 ? '+' : ''}{ipo.firstDayPop}% day 1
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="text-sm">
                  {ipo.year3AnnualizedReturn !== null && ipo.year3AnnualizedReturn !== undefined ? (
                    <>
                      <div className={`font-medium ${ipo.year3AnnualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        3Y Ann: {ipo.year3AnnualizedReturn > 0 ? '+' : ''}{ipo.year3AnnualizedReturn.toFixed(1)}%
                      </div>
                      {ipo.year1Return !== null && ipo.year1Return !== undefined && (
                        <div className={`text-xs ${ipo.year1Return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          1Y: {ipo.year1Return > 0 ? '+' : ''}{ipo.year1Return.toFixed(1)}%
                        </div>
                      )}
                    </>
                  ) : ipo.year1Return !== null && ipo.year1Return !== undefined ? (
                    <div className={`font-medium ${ipo.year1Return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      1Y: {ipo.year1Return > 0 ? '+' : ''}{ipo.year1Return.toFixed(1)}%
                    </div>
                  ) : (
                    <div className="text-gray-400 font-medium">
                      {ipo.status && ipo.status.includes('Acquired') ? 'Acquired' : 'N/A'}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="text-sm">
                  {ipo.year3Outperformance !== null && ipo.year3Outperformance !== undefined ? (
                    <>
                      <div className={`font-medium ${ipo.year3Outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        3Y Ann: {ipo.year3Outperformance > 0 ? '+' : ''}{ipo.year3Outperformance.toFixed(1)}%
                      </div>
                      {ipo.year1Outperformance !== null && ipo.year1Outperformance !== undefined && (
                        <div className={`text-xs ${ipo.year1Outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          1Y: {ipo.year1Outperformance > 0 ? '+' : ''}{ipo.year1Outperformance.toFixed(1)}%
                        </div>
                      )}
                    </>
                  ) : ipo.year1Outperformance !== null && ipo.year1Outperformance !== undefined ? (
                    <div className={`font-medium ${ipo.year1Outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      1Y: {ipo.year1Outperformance > 0 ? '+' : ''}{ipo.year1Outperformance.toFixed(1)}%
                    </div>
                  ) : (
                    <div className="text-gray-400 font-medium">
                      {ipo.status && ipo.status.includes('Acquired') ? 'Acquired' : 'N/A'}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {ipo.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span key={tagIndex} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tagIndex)}`}>
                      {tag}
                    </span>
                  ))}
                  {ipo.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      +{ipo.tags.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <span className={`text-xs font-medium ${getStatusColor(ipo.status)}`}>
                  {ipo.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

const BarChartView = ({ chartData }) => {
  // Calculate dynamic statistics
  const sortedYears = [...chartData.yearData].sort((a, b) => b.count - a.count);
  const peakYear = sortedYears[0];
  const strongYears = sortedYears.slice(1, 6).filter(year => year.count >= 5);
  const recentYears = chartData.yearData.filter(year => year.year >= 2023).sort((a, b) => a.year - b.year);
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">IPO Activity by Year</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData.yearData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#4b5563' }} />
          <YAxis tick={{ fontSize: 12, fill: '#4b5563' }} tickFormatter={(value) => Math.round(value).toString()} domain={[0, 'dataMax']} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
            {chartData.yearData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.year === 2021 ? '#ef4444' : entry.year === 2022 ? '#6b7280' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Peak Year:</strong> {peakYear.year} ({peakYear.count} IPOs){peakYear.year === 2021 ? ' - Historic bubble peak' : ''}</p>
        {strongYears.length > 0 && (
          <p><strong>Other Strong Years:</strong> {strongYears.map(year => `${year.year} (${year.count} IPOs)`).join(', ')}</p>
        )}
        {recentYears.length > 0 && (
          <p><strong>Recent Activity:</strong> {recentYears.map(year => `${year.year} (${year.count} IPO${year.count !== 1 ? 's' : ''})`).join(', ')}</p>
        )}
      </div>
    </div>
  );
};

const ScatterPlotView = ({ filteredIPOs, scatterXAxis, setScatterXAxis, scatterYAxis, setScatterYAxis }) => {
  const axisOptions = {
    firstDayPop: 'First Day Pop %',
    ipoPrice: 'IPO Price ($)',
    currentPrice: 'Current Price ($)',
    firstDayPrice: 'First Day Price ($)',
    year: 'IPO Year',
    returnPct: 'Total Return %',
    currentReturn: 'Current Return (x)',
    year1Return: 'Year 1 Return %',
    year3AnnualizedReturn: '3-Year Annualized Return %',
    year1Outperformance: 'Year 1 vs IGV %',
    year3Outperformance: '3-Year vs IGV %'
  };

  const scatterData = filteredIPOs.map(ipo => {
    const totalReturn = ((ipo.currentPrice - ipo.ipoPrice) / ipo.ipoPrice) * 100;
    const currentReturn = ipo.currentPrice / ipo.ipoPrice;
    
    return {
      company: ipo.company,
      ticker: ipo.ticker,
      firstDayPop: ipo.firstDayPop,
      ipoPrice: ipo.ipoPrice,
      currentPrice: ipo.currentPrice,
      firstDayPrice: ipo.firstDayPrice || ipo.ipoPrice * (1 + ipo.firstDayPop / 100),
      year: ipo.year,
      returnPct: totalReturn,
      currentReturn: currentReturn,
      year1Return: ipo.year1Return,
      year3AnnualizedReturn: ipo.year3AnnualizedReturn,
      year1Outperformance: ipo.year1Outperformance,
      year3Outperformance: ipo.year3Outperformance,
      status: ipo.status
    };
  });

  const getAxisRange = (data, key) => {
    if (data.length === 0) return [0, 100];
    
    const values = data.map(d => d[key]).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return [0, 100];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.1;
    
    return [
      Math.max(0, min - padding),
      max + padding
    ];
  };

  const xAxisRange = getAxisRange(scatterData, scatterXAxis);
  const yAxisRange = getAxisRange(scatterData, scatterYAxis);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Custom Scatter Analysis</h3>
        <div className="flex gap-2">
          <div>
            <label className="text-xs text-gray-600 mr-2">X-Axis:</label>
            <select 
              value={scatterXAxis}
              onChange={(e) => setScatterXAxis(e.target.value)}
              className="text-sm px-2 py-1 border border-gray-300 rounded"
            >
              {Object.entries(axisOptions).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mr-2">Y-Axis:</label>
            <select 
              value={scatterYAxis}
              onChange={(e) => setScatterYAxis(e.target.value)}
              className="text-sm px-2 py-1 border border-gray-300 rounded"
            >
              {Object.entries(axisOptions).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            type="number" 
            dataKey={scatterXAxis}
            name={axisOptions[scatterXAxis]}
            domain={xAxisRange}
            tick={{ fontSize: 12, fill: '#4b5563' }}
            tickFormatter={(value) => formatAxisValue(value, scatterXAxis)}
            label={{ value: axisOptions[scatterXAxis], position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            type="number" 
            dataKey={scatterYAxis}
            name={axisOptions[scatterYAxis]}
            domain={yAxisRange}
            tick={{ fontSize: 12, fill: '#4b5563' }}
            tickFormatter={(value) => formatAxisValue(value, scatterYAxis)}
            label={{ value: axisOptions[scatterYAxis], angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">{data.company} ({data.ticker})</p>
                    <p className="text-sm">{axisOptions[scatterXAxis]}: {
                      typeof data[scatterXAxis] === 'number' ? 
                        formatAxisValue(data[scatterXAxis], scatterXAxis) : 
                        data[scatterXAxis]
                    }</p>
                    <p className="text-sm">{axisOptions[scatterYAxis]}: {
                      typeof data[scatterYAxis] === 'number' ? 
                        formatAxisValue(data[scatterYAxis], scatterYAxis) : 
                        data[scatterYAxis]
                    }</p>
                    <p className="text-xs text-gray-500 mt-1">{data.status}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            data={scatterData} 
            fill="#3b82f6"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
      
    </div>
  );
};

// ===========================
// MAIN DASHBOARD COMPONENT
// ===========================
const CompleteEnterpriseIPODashboard = () => {
  const [unifiedSearch, setUnifiedSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewType, setViewType] = useState('table');
  const [scatterXAxis, setScatterXAxis] = useState('firstDayPop');
  const [scatterYAxis, setScatterYAxis] = useState('returnPct');
  const [sortField, setSortField] = useState('year3AnnualizedReturn');
  const [sortDirection, setSortDirection] = useState('desc');
  const [ipoData, setIpoData] = useState(ENTERPRISE_IPO_DATA);

  const handleDataUpdate = (updatedData) => {
    setIpoData(updatedData);
  };

  // Extract all unique tags
  // Parse unified search into different types
  const parseUnifiedSearch = (query) => {
    if (!query) return { years: null, tags: [], companies: [], tickers: [] };
    
    const searchLower = query.toLowerCase().trim();
    
    // Check if it's a year pattern
    const yearMatch = searchLower.match(/^(\d{4})(-(\d{4}))?$/);
    if (yearMatch) {
      const startYear = parseInt(yearMatch[1]);
      const endYear = yearMatch[3] ? parseInt(yearMatch[3]) : startYear;
      const years = new Set();
      for (let year = startYear; year <= endYear; year++) {
        years.add(year);
      }
      return { years, tags: [], companies: [], tickers: [] };
    }
    
    // Check if it's a comma-separated list of years
    const yearListMatch = searchLower.match(/^(\d{4})(,\s*\d{4})*$/);
    if (yearListMatch) {
      const years = new Set(searchLower.split(',').map(y => parseInt(y.trim())));
      return { years, tags: [], companies: [], tickers: [] };
    }
    
    // Check if it's a range like "2020-"
    const openRangeMatch = searchLower.match(/^(\d{4})-$/);
    if (openRangeMatch) {
      const startYear = parseInt(openRangeMatch[1]);
      const years = new Set();
      for (let year = startYear; year <= 2025; year++) {
        years.add(year);
      }
      return { years, tags: [], companies: [], tickers: [] };
    }
    
    // Otherwise, treat as general search for companies, tickers, and tags
    return { years: null, tags: [searchLower], companies: [searchLower], tickers: [searchLower] };
  };

  // Generate suggestions based on current search
  const suggestions = useMemo(() => {
    if (!unifiedSearch || unifiedSearch.length < 1) {
      // Show popular suggestions when empty
      return [
        { value: '2020-2025', display: '2020-2025', type: 'year range' },
        { value: '2023', display: '2023', type: 'year' },
        { value: 'AI', display: 'AI', type: 'tag' },
        { value: 'Security', display: 'Security', type: 'tag' },
        { value: 'SNOW', display: 'SNOW (Snowflake)', type: 'ticker' },
        { value: 'PLTR', display: 'PLTR (Palantir)', type: 'ticker' },
      ];
    }
    
    const searchLower = unifiedSearch.toLowerCase();
    const suggestions = [];
    
    // Company and ticker suggestions
    ipoData.forEach(ipo => {
      if (ipo.company.toLowerCase().includes(searchLower) || ipo.ticker.toLowerCase().includes(searchLower)) {
        suggestions.push({
          value: ipo.ticker,
          display: `${ipo.ticker} (${ipo.company})`,
          type: 'company'
        });
      }
    });
    
    // Tag suggestions
    const allTags = new Set();
    ipoData.forEach(ipo => ipo.tags.forEach(tag => allTags.add(tag)));
    Array.from(allTags).forEach(tag => {
      if (tag.toLowerCase().includes(searchLower)) {
        const count = ipoData.filter(ipo => ipo.tags.includes(tag)).length;
        suggestions.push({
          value: tag,
          display: `${tag} (${count} companies)`,
          type: 'tag'
        });
      }
    });
    
    // Year suggestions
    const currentYear = new Date().getFullYear();
    if (/^\d{1,4}$/.test(unifiedSearch)) {
      const partial = parseInt(unifiedSearch);
      for (let year = 2010; year <= currentYear; year++) {
        if (year.toString().startsWith(unifiedSearch)) {
          suggestions.push({
            value: year.toString(),
            display: `${year}`,
            type: 'year'
          });
        }
      }
      
      // Add range suggestions
      if (unifiedSearch.length === 4) {
        suggestions.push({
          value: `${unifiedSearch}-${currentYear}`,
          display: `${unifiedSearch}-${currentYear}`,
          type: 'year range'
        });
      }
    }
    
    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }, [unifiedSearch, ipoData]);

  const filteredIPOs = useMemo(() => {
    const searchCriteria = parseUnifiedSearch(unifiedSearch);
    
    const filtered = ipoData.filter(ipo => {
      // Year filtering
      if (searchCriteria.years && !searchCriteria.years.has(ipo.year)) {
        return false;
      }
      
      // If we have specific search terms for companies/tickers/tags
      if (searchCriteria.companies.length > 0 || searchCriteria.tickers.length > 0 || searchCriteria.tags.length > 0) {
        const matchesCompany = searchCriteria.companies.length === 0 || 
          searchCriteria.companies.some(term => ipo.company.toLowerCase().includes(term));
        
        const matchesTicker = searchCriteria.tickers.length === 0 || 
          searchCriteria.tickers.some(term => ipo.ticker.toLowerCase().includes(term));
        
        const matchesTag = searchCriteria.tags.length === 0 || 
          searchCriteria.tags.some(term => ipo.tags.some(tag => tag.toLowerCase().includes(term)));
        
        return matchesCompany || matchesTicker || matchesTag;
      }
      
      return true; // If no search criteria, show all (after year filtering)
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      // ALWAYS put acquired companies at the bottom regardless of sort direction
      const aIsAcquired = a.status.includes('Acquired');
      const bIsAcquired = b.status.includes('Acquired');
      
      if (aIsAcquired && !bIsAcquired) return 1;  // a is acquired, put it at bottom
      if (!aIsAcquired && bIsAcquired) return -1; // b is acquired, put it at bottom
      if (aIsAcquired && bIsAcquired) return 0;   // both acquired, don't sort between them
      
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Special handling for return-based sorting: group by data availability
      if (sortField === 'year3AnnualizedReturn') {
        const aHas3Y = a.year3AnnualizedReturn !== null && a.year3AnnualizedReturn !== undefined;
        const bHas3Y = b.year3AnnualizedReturn !== null && b.year3AnnualizedReturn !== undefined;
        
        // For descending: 3Y data first, then 1Y data
        // For ascending: still 3Y data first, then 1Y data (but within each group, sort ascending)
        if (aHas3Y && !bHas3Y) return -1; // a has 3Y, b doesn't - a comes first regardless of direction
        if (!aHas3Y && bHas3Y) return 1;  // b has 3Y, a doesn't - b comes first regardless of direction
        
        // Both have same data type - sort within group
        if (aHas3Y && bHas3Y) {
          // Both have 3Y data - compare their 3Y annualized returns
          aValue = a.year3AnnualizedReturn;
          bValue = b.year3AnnualizedReturn;
        } else {
          // Both have only 1Y data - compare their 1Y returns (total returns, not annualized)
          aValue = a.year1Return;
          bValue = b.year1Return;
        }
      } else if (sortField === 'year3Outperformance') {
        const aHas3Y = a.year3Outperformance !== null && a.year3Outperformance !== undefined;
        const bHas3Y = b.year3Outperformance !== null && b.year3Outperformance !== undefined;
        
        // For descending: 3Y data first, then 1Y data
        // For ascending: still 3Y data first, then 1Y data (but within each group, sort ascending)
        if (aHas3Y && !bHas3Y) return -1; // a has 3Y, b doesn't - a comes first regardless of direction
        if (!aHas3Y && bHas3Y) return 1;  // b has 3Y, a doesn't - b comes first regardless of direction
        
        // Both have same data type - sort within group
        if (aHas3Y && bHas3Y) {
          // Both have 3Y data - compare their 3Y outperformance vs IGV
          aValue = a.year3Outperformance;
          bValue = b.year3Outperformance;
        } else {
          // Both have only 1Y data - compare their 1Y outperformance vs IGV
          aValue = a.year1Outperformance;
          bValue = b.year1Outperformance;
        }
      }
      
      // Handle null/undefined values - put them at the end (but still before acquired companies)
      if (aValue === null || aValue === undefined) {
        if (bValue === null || bValue === undefined) return 0;
        return 1; // a is null, put it after b
      }
      if (bValue === null || bValue === undefined) {
        return -1; // b is null, put it after a
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'desc' ? -comparison : comparison;
      }
      
      // Handle numeric sorting
      if (sortDirection === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
  }, [unifiedSearch, ipoData, sortField, sortDirection]);

  const chartData = useMemo(() => {
    const yearCounts = {};
    ipoData.forEach(ipo => {
      yearCounts[ipo.year] = (yearCounts[ipo.year] || 0) + 1;
    });

    // Generate complete year range from 2010 to 2025
    const currentYear = new Date().getFullYear();
    const startYear = 2010; // Focus on recent enterprise software IPO activity
    const endYear = Math.max(currentYear, 2025);
    
    const yearData = [];
    for (let year = startYear; year <= endYear; year++) {
      yearData.push({
        year: year,
        count: yearCounts[year] || 0
      });
    }

    return { yearData };
  }, [ipoData]);

  const renderMainContent = () => {
    if (viewType === 'table') {
      return <TableView 
        filteredIPOs={filteredIPOs} 
        sortField={sortField}
        sortDirection={sortDirection}
        setSortField={setSortField}
        setSortDirection={setSortDirection}
      />;
    } else if (viewType === 'bar') {
      return <BarChartView chartData={chartData} />;
    } else if (viewType === 'scatter') {
      return <ScatterPlotView 
        filteredIPOs={filteredIPOs} 
        scatterXAxis={scatterXAxis}
        setScatterXAxis={setScatterXAxis}
        scatterYAxis={scatterYAxis}
        setScatterYAxis={setScatterYAxis}
      />;
    }
  };

  return (
    <div className="w-full p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Complete Enterprise Software IPO Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive database of {ipoData.length} enterprise software IPOs (2004-2025) with multi-tag categorization
          </p>
        </div>

        <SummaryStats filteredIPOs={filteredIPOs} />

        <FilterControls 
          unifiedSearch={unifiedSearch}
          setUnifiedSearch={setUnifiedSearch}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          suggestions={suggestions}
          viewType={viewType}
          setViewType={setViewType}
        />

        {renderMainContent()}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Showing {filteredIPOs.length} of {ipoData.length} total enterprise software IPOs</p>
          <p className="mt-2 text-xs text-amber-600">
            ⚠️ Stock prices last updated: Sep 10, 2025 | IPO prices are historical | Acquisition prices reflect deal values
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteEnterpriseIPODashboard;