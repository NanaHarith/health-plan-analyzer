import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const CostCalculator = ({ plans }) => {
  const [procedureAmount, setProcedureAmount] = useState(14000);
  const [routineVisits, setRoutineVisits] = useState(3);
  const [labTests, setLabTests] = useState(2);
  const [procedureName, setProcedureName] = useState('Major Procedure');
  const [insuranceDiscount, setInsuranceDiscount] = useState(0.75); // 75% = typical allowed amount

  const calculateCosts = (plan, procedureAmt, visits, labs) => {
    const annualPremium = plan.premium * 24;
    
    // Apply insurance discount to get allowed amount
    const allowedProcedureAmt = procedureAmt * insuranceDiscount;
    
    let totalMedicalCharges = procedureAmt; // Keep full amount for display
    let runningDeductible = 0;
    let totalOOP = 0;
    
    // Office visits ($150 per visit)
    const visitCharge = 150;
    for (let i = 0; i < visits; i++) {
      if (plan.officeVisit === 'ded') {
        const remainingDed = Math.max(0, plan.deductible - runningDeductible);
        if (remainingDed > 0) {
          const dedPortion = Math.min(visitCharge, remainingDed);
          totalOOP += dedPortion;
          runningDeductible += dedPortion;
          
          const afterDed = visitCharge - dedPortion;
          if (afterDed > 0) {
            totalOOP += afterDed * plan.outpatient;
          }
        } else {
          totalOOP += visitCharge * plan.outpatient;
        }
      } else {
        totalOOP += plan.officeVisit;
      }
      totalMedicalCharges += visitCharge;
    }
    
    // Lab tests ($200 per test)
    const labCharge = 200;
    for (let i = 0; i < labs; i++) {
      if (plan.lab === 'ded') {
        const remainingDed = Math.max(0, plan.deductible - runningDeductible);
        if (remainingDed > 0) {
          const dedPortion = Math.min(labCharge, remainingDed);
          totalOOP += dedPortion;
          runningDeductible += dedPortion;
          
          const afterDed = labCharge - dedPortion;
          if (afterDed > 0) {
            totalOOP += afterDed * plan.outpatient;
          }
        } else {
          totalOOP += labCharge * plan.outpatient;
        }
      } else {
        totalOOP += plan.lab;
      }
      totalMedicalCharges += labCharge;
    }
    
    // Major procedure
    const remainingDed = Math.max(0, plan.deductible - runningDeductible);
    let procedureOOP = 0;
    
    if (remainingDed > 0) {
      const dedPortion = Math.min(allowedProcedureAmt, remainingDed);
      procedureOOP += dedPortion;
      
      const afterDed = allowedProcedureAmt - dedPortion;
      if (afterDed > 0) {
        procedureOOP += afterDed * plan.outpatient;
      }
    } else {
      procedureOOP += allowedProcedureAmt * plan.outpatient;
    }
    
    totalOOP += procedureOOP;
    totalOOP = Math.min(totalOOP, plan.oopMax);
    
    return {
      annualPremium,
      totalOOP,
      totalAnnualCost: annualPremium + totalOOP,
      totalMedicalCharges
    };
  };

  const planResults = useMemo(() => {
    return plans.map(plan => ({
      ...plan,
      ...calculateCosts(plan, procedureAmount, routineVisits, labTests)
    }));
  }, [plans, procedureAmount, routineVisits, labTests, insuranceDiscount]);

  const comparisonData = planResults.map(plan => ({
    plan: plan.name.split(' ').slice(0, 2).join('\n'),
    premiums: plan.annualPremium,
    oop: plan.totalOOP,
    total: plan.totalAnnualCost
  }));

  const breakEvenData = useMemo(() => {
    const data = [];
    for (let cost = 0; cost <= 30000; cost += 500) {
      const point = { cost };
      plans.forEach(plan => {
        const result = calculateCosts(plan, cost, routineVisits, labTests);
        point[plan.id] = result.totalAnnualCost;
      });
      data.push(point);
    }
    return data;
  }, [plans, routineVisits, labTests, insuranceDiscount]);

  const winner = planResults.reduce((min, plan) => 
    plan.totalAnnualCost < min.totalAnnualCost ? plan : min
  );

  const renderZones = () => {
    const zones = [];
    let currentWinner = null;
    let zoneStart = 0;
    
    breakEvenData.forEach((point, idx) => {
      const costs = plans.map(plan => ({ id: plan.id, cost: point[plan.id] }));
      const winnerPlan = costs.reduce((min, curr) => curr.cost < min.cost ? curr : min);
      
      if (winnerPlan.id !== currentWinner) {
        if (currentWinner !== null) {
          const winnerColor = plans.find(p => p.id === currentWinner)?.color || '#000';
          zones.push(
            <rect
              key={zones.length}
              x={((zoneStart / 30000) * 100) + '%'}
              y="0"
              width={(((point.cost - zoneStart) / 30000) * 100) + '%'}
              height="100%"
              fill={winnerColor}
              opacity={0.15}
            />
          );
        }
        currentWinner = winnerPlan.id;
        zoneStart = point.cost;
      }
      
      if (idx === breakEvenData.length - 1) {
        const winnerColor = plans.find(p => p.id === currentWinner)?.color || '#000';
        zones.push(
          <rect
            key={zones.length}
            x={((zoneStart / 30000) * 100) + '%'}
            y="0"
            width={(((point.cost - zoneStart) / 30000) * 100) + '%'}
            height="100%"
            fill={winnerColor}
            opacity={0.15}
          />
        );
      }
    });
    
    return zones;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Cost Analysis Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Procedure Name
            </label>
            <input
              type="text"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Surgery, Hip Replacement"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {procedureName} Billed Cost: ${procedureAmount.toLocaleString()}
            </label>
            <input
              type="range"
              min="5000"
              max="50000"
              step="1000"
              value={procedureAmount}
              onChange={(e) => setProcedureAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insurance Negotiated Rate: {(insuranceDiscount * 100).toFixed(0)}% of billed 
            (Allowed Amount: ${(procedureAmount * insuranceDiscount).toLocaleString()})
          </label>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={insuranceDiscount}
            onChange={(e) => setInsuranceDiscount(parseFloat(e.target.value))}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-600 mt-2">
            Typical: 70-80% (insurance negotiates 20-30% discount). Set to 100% if you know the exact allowed amount.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Office Visits per Year: {routineVisits}
            </label>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={routineVisits}
              onChange={(e) => setRoutineVisits(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lab Tests per Year: {labTests}
            </label>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={labTests}
              onChange={(e) => setLabTests(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-500 p-4 rounded-lg">
          <p className="text-lg font-bold text-green-800 mb-2">
            WINNER: {winner.name}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Medical Charges:</p>
              <p className="font-bold text-lg">${winner.totalMedicalCharges.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Annual Premium:</p>
              <p className="font-bold text-lg">${winner.annualPremium.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Your Out-of-Pocket:</p>
              <p className="font-bold text-lg text-red-600">${winner.totalOOP.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Your Total Cost:</p>
              <p className="font-bold text-xl text-green-600">${winner.totalAnnualCost.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {planResults.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-md p-4 ${
              plan.id === winner.id ? 'ring-4' : ''
            }`}
            style={plan.id === winner.id ? { borderColor: plan.color } : {}}
          >
            {plan.id === winner.id && (
              <div
                className="text-white text-xs font-bold px-2 py-1 rounded mb-2 inline-block"
                style={{ backgroundColor: plan.color }}
              >
                BEST VALUE
              </div>
            )}
            <h3 className="font-bold text-gray-800 text-sm mb-3">{plan.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Premium:</span>
                <span className="font-semibold">${plan.annualPremium.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Out-of-Pocket:</span>
                <span className="font-semibold text-red-600">${plan.totalOOP.toLocaleString()}</span>
              </div>
              <div className="bg-gray-100 p-2 rounded flex justify-between">
                <span className="font-bold text-gray-800">Total:</span>
                <span className="font-bold text-blue-700 text-lg">
                  ${plan.totalAnnualCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Total Annual Cost Breakdown</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="plan" />
            <YAxis tickFormatter={(val) => `$${(val/1000).toFixed(0)}K`} />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="premiums" stackId="a" fill="#3b82f6" name="Annual Premiums" />
            <Bar dataKey="oop" stackId="a" fill="#ef4444" name="Out-of-Pocket" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Break-Even Analysis</h2>
        <p className="text-sm text-gray-600 mb-4">
          Colored bands show which plan is most economical at each medical cost level
        </p>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={breakEvenData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="cost" 
              tickFormatter={(val) => `$${(val/1000).toFixed(0)}K`}
            />
            <YAxis tickFormatter={(val) => `$${(val/1000).toFixed(0)}K`} />
            <Tooltip 
              formatter={(value) => `$${value.toLocaleString()}`}
              labelFormatter={(label) => `Medical Cost: $${label.toLocaleString()}`}
            />
            <Legend />
            {renderZones()}
            {plans.map(plan => (
              <Line 
                key={plan.id}
                type="monotone" 
                dataKey={plan.id} 
                stroke={plan.color}
                name={plan.name}
                strokeWidth={3}
                dot={false}
              />
            ))}
            <ReferenceLine 
              x={procedureAmount + (routineVisits * 150) + (labTests * 200)} 
              stroke="red" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: 'Your Scenario', position: 'top', fill: 'red', fontWeight: 'bold' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CostCalculator;