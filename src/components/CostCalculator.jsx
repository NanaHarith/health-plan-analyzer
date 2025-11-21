import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const CostCalculator = ({ plans }) => {
  // Medical Scenario Inputs
  const [procedureAmount, setProcedureAmount] = useState(5000);
  const [procedureName, setProcedureName] = useState('Major Procedure');
  const [insuranceDiscount, setInsuranceDiscount] = useState(0.60);
  
  // Routine Care Inputs
  const [routineVisits, setRoutineVisits] = useState(4);
  const [visitCost, setVisitCost] = useState(200);
  const [labTests, setLabTests] = useState(2);
  const [labCost, setLabCost] = useState(150);

  // Financial Inputs
  const [taxRate, setTaxRate] = useState(0.30);
  const [employerHSA, setEmployerHSA] = useState(0);
  const [maxHSAContribution] = useState(4300);

  const calculateCosts = (plan, procedureAmt, visits, labs) => {
    const payPeriods = plan.premium > 800 ? 12 : 24; 
    const annualPremium = plan.premium * payPeriods;
    
    const isHSA = plan.name.toLowerCase().includes('hdhp') || 
                  plan.name.toLowerCase().includes('hsa') ||
                  plan.deductible >= 1600;

    let taxSavings = 0;
    let employerContribution = 0;
    
    if (isHSA) {
      employerContribution = employerHSA;
      const personalContribution = Math.max(0, maxHSAContribution - employerContribution);
      taxSavings = personalContribution * taxRate;
    }

    const allowedProcedureAmt = procedureAmt * insuranceDiscount;
    let runningDeductible = 0;
    let totalOOP = 0;
    
    const processCost = (cost, type) => {
      const allowedCost = cost * insuranceDiscount;
      let costToPatient = 0;
      let copayOrCoins = 0;
      
      if (type === 'visit') copayOrCoins = plan.officeVisit;
      if (type === 'lab') copayOrCoins = plan.lab;
      if (type === 'procedure') copayOrCoins = 'ded';

      if (copayOrCoins === 'ded') {
        const remainingDed = Math.max(0, plan.deductible - runningDeductible);
        if (remainingDed > 0) {
          const dedPortion = Math.min(allowedCost, remainingDed);
          costToPatient += dedPortion;
          runningDeductible += dedPortion;
          const afterDed = allowedCost - dedPortion;
          if (afterDed > 0) {
            costToPatient += afterDed * plan.outpatient;
          }
        } else {
          costToPatient += allowedCost * plan.outpatient;
        }
      } else {
        costToPatient += copayOrCoins;
      }
      return costToPatient;
    };
    
    for (let i = 0; i < visits; i++) totalOOP += processCost(visitCost, 'visit');
    for (let i = 0; i < labs; i++) totalOOP += processCost(labCost, 'lab');
    
    const remainingDed = Math.max(0, plan.deductible - runningDeductible);
    let procedureOOP = 0;
    if (remainingDed > 0) {
      const dedPortion = Math.min(allowedProcedureAmt, remainingDed);
      procedureOOP += dedPortion;
      const afterDed = allowedProcedureAmt - dedPortion;
      if (afterDed > 0) procedureOOP += afterDed * plan.outpatient;
    } else {
      procedureOOP += allowedProcedureAmt * plan.outpatient;
    }
    totalOOP += procedureOOP;
    totalOOP = Math.min(totalOOP, plan.oopMax);
    
    const totalAnnualCost = (annualPremium + totalOOP) - (taxSavings + employerContribution);

    return {
      annualPremium,
      totalOOP,
      taxSavings,
      employerContribution,
      totalAnnualCost,
      totalMedicalCharges: procedureAmt + (visits * visitCost) + (labs * labCost),
      isHSA
    };
  };

  const planResults = useMemo(() => {
    return plans.map(plan => ({
      ...plan,
      ...calculateCosts(plan, procedureAmount, routineVisits, labTests)
    }));
  }, [plans, procedureAmount, routineVisits, visitCost, labTests, labCost, insuranceDiscount, taxRate, employerHSA]);

  const breakEvenData = useMemo(() => {
    const data = [];
    for (let cost = 0; cost <= 50000; cost += 500) {
      const point = { cost };
      plans.forEach(plan => {
        const result = calculateCosts(plan, cost, routineVisits, labTests);
        point[plan.id] = result.totalAnnualCost;
      });
      data.push(point);
    }
    return data;
  }, [plans, routineVisits, visitCost, labTests, labCost, insuranceDiscount, taxRate, employerHSA]);

  const winner = planResults.reduce((min, plan) => 
    plan.totalAnnualCost < min.totalAnnualCost ? plan : min
  );

  const renderZones = () => {
    if (breakEvenData.length === 0) return null;
    const zones = [];
    let currentWinner = null;
    let zoneStart = 0;
    const maxCost = 50000;
    
    const createZone = (start, end, winnerId) => {
      const winnerColor = plans.find(p => p.id === winnerId)?.color || '#000';
      const x = (start / maxCost) * 100;
      const width = ((end - start) / maxCost) * 100;
      
      // 1. The "Ladder" Ribbon (Top Strip)
      zones.push(
        <rect
          key={`ribbon-${start}`}
          x={x + '%'}
          y="0"
          width={width + '%'}
          height="25" // 25px tall ribbon
          fill={winnerColor}
          opacity={0.9}
        />
      );

      // 2. The Background (Full Height) - Fainter now
      zones.push(
        <rect
          key={`bg-${start}`}
          x={x + '%'}
          y="0"
          width={width + '%'}
          height="100%"
          fill={winnerColor}
          opacity={0.05}
        />
      );
    };

    breakEvenData.forEach((point, idx) => {
      const costs = plans.map(plan => ({ id: plan.id, cost: point[plan.id] }));
      const winnerPlan = costs.reduce((min, curr) => curr.cost < min.cost ? curr : min);
      
      if (winnerPlan.id !== currentWinner) {
        if (currentWinner !== null) {
          createZone(zoneStart, point.cost, currentWinner);
        }
        currentWinner = winnerPlan.id;
        zoneStart = point.cost;
      }
      
      if (idx === breakEvenData.length - 1) {
        createZone(zoneStart, point.cost, currentWinner);
      }
    });
    
    return (
      <g>
        <text x="5" y="18" fontSize="10" fill="#fff" fontWeight="bold" style={{pointerEvents: 'none'}}>
          WINNER →
        </text>
        {zones}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const sorted = [...payload].sort((a, b) => a.value - b.value);
      const best = sorted[0];
      
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg z-50">
          <p className="font-bold mb-2 border-b pb-1">Procedure Cost: ${label.toLocaleString()}</p>
          {sorted.map((entry, index) => {
            const diff = entry.value - best.value;
            return (
              <div key={index} className="flex justify-between items-center gap-4 text-sm mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.color}}></div>
                    <span style={{ color: index === 0 ? '#000' : '#666', fontWeight: index === 0 ? 'bold' : 'normal' }}>
                        {entry.name}
                    </span>
                </div>
                <div className="text-right">
                    <span className="font-mono font-bold block">${Math.round(entry.value).toLocaleString()}</span>
                    {index > 0 && (
                        <span className="text-xs text-red-500 font-medium">
                            +${Math.round(diff).toLocaleString()}
                        </span>
                    )}
                    {index === 0 && (
                        <span className="text-xs text-green-600 font-bold">
                            BEST PRICE
                        </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">1. Financial Assumptions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Negotiated Rate Discount
            </label>
            <div className="flex items-center justify-between mb-2">
               <span className="text-2xl font-bold text-blue-600">{(insuranceDiscount * 100).toFixed(0)}%</span>
               <span className="text-xs text-gray-500">of billed charges</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={insuranceDiscount}
              onChange={(e) => setInsuranceDiscount(parseFloat(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-600 mt-2">
              Applies to Procedure & Deductible items.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tax Bracket (for HSA)
            </label>
            <div className="flex items-center justify-between mb-2">
               <span className="text-2xl font-bold text-green-600">{(taxRate * 100).toFixed(0)}%</span>
               <span className="text-xs text-gray-500">effective savings</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.50"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-600 mt-2">
              HSA plans deduct contributions pre-tax.
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Employer HSA Contrib.
            </label>
            <div className="flex items-center justify-between mb-2">
               <span className="text-2xl font-bold text-purple-600">${employerHSA}</span>
               <span className="text-xs text-gray-500">free money</span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={employerHSA}
              onChange={(e) => setEmployerHSA(parseInt(e.target.value))}
              className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-600 mt-2">
              Check your benefits guide (usually $500-$1000).
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">2. Medical Usage Estimates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Major Procedure (Billed)</label>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="number" value={procedureAmount} onChange={(e) => setProcedureAmount(Number(e.target.value))} className="w-full p-2 border rounded" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visits ({routineVisits}/yr)</label>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="number" value={visitCost} onChange={(e) => setVisitCost(Number(e.target.value))} className="w-full p-2 border rounded" placeholder="Cost per visit" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labs ({labTests}/yr)</label>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input type="number" value={labCost} onChange={(e) => setLabCost(Number(e.target.value))} className="w-full p-2 border rounded" placeholder="Cost per lab" />
                </div>
            </div>
        </div>

        {/* WINNER BANNER */}
        <div className="bg-gray-900 text-white p-6 rounded-xl shadow-xl mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
                <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-1">Financially Optimal Plan</h3>
                <div className="text-3xl font-bold text-white flex items-center gap-3">
                    {winner.name}
                    {winner.isHSA && <span className="bg-green-500 text-xs px-2 py-1 rounded text-black font-bold">HSA ELIGIBLE</span>}
                </div>
                <p className="text-gray-400 mt-2 text-sm">
                    Net Annual Cost: <span className="text-green-400 font-bold text-lg">${winner.totalAnnualCost.toLocaleString()}</span> 
                    <span className="mx-2">|</span> 
                    Max Possible Risk: <span className="text-red-300 font-bold">${(winner.annualPremium + winner.oopMax - winner.taxSavings - winner.employerContribution).toLocaleString()}</span>
                </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
                <div className="text-sm text-gray-400">vs. Most Expensive Plan</div>
                <div className="text-xl font-bold text-red-400">
                    Save ${(Math.max(...planResults.map(p => p.totalAnnualCost)) - winner.totalAnnualCost).toLocaleString()} / year
                </div>
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {planResults.map(plan => (
                <div key={plan.id} className={`border rounded-lg p-4 relative ${plan.id === winner.id ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'bg-white'}`}>
                    <h4 className="font-bold text-gray-800 mb-2 min-h-[40px]">{plan.name}</h4>
                    
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Premium (Yr)</span>
                            <span>${plan.annualPremium.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Est. OOP</span>
                            <span className="text-red-600">+ ${plan.totalOOP.toLocaleString()}</span>
                        </div>
                        {(plan.taxSavings > 0 || plan.employerContribution > 0) && (
                            <div className="flex justify-between text-green-700 bg-green-100 px-2 py-1 rounded">
                                <span>Tax/Emp Savings</span>
                                <span>- ${(plan.taxSavings + plan.employerContribution).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                            <span>Net Cost</span>
                            <span>${plan.totalAnnualCost.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Risk Capacity</span>
                            <span>Max: ${plan.oopMax.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-red-400 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (plan.totalOOP / plan.oopMax) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* CHART */}
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Cost Analysis Across Spending Levels</h3>
            <p className="text-sm text-gray-500 mb-4">
                X-Axis: Total Billed Medical Expenses | Y-Axis: Your Net Cost (Premium + OOP - Tax Savings)
            </p>
            <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={breakEvenData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                            dataKey="cost" 
                            type="number" 
                            domain={[0, 50000]} 
                            tickFormatter={(val) => `$${val/1000}k`}
                            label={{ value: 'Billed Procedure Cost', position: 'bottom', offset: 0 }}
                        />
                        <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36}/>
                        {renderZones()}
                        {plans.map((plan) => (
                            <Line 
                                key={plan.id}
                                type="monotone" 
                                dataKey={plan.id} 
                                name={plan.name} 
                                stroke={plan.color} 
                                strokeWidth={3} 
                                dot={false} 
                                activeDot={{ r: 8 }}
                            />
                        ))}
                        <ReferenceLine x={procedureAmount} stroke="red" strokeDasharray="3 3" label="Your Est." />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CostCalculator;