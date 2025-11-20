import React, { useState } from 'react';
import PlanUploader from './components/PlanUploader.jsx';
import CostCalculator from './components/CostCalculator.jsx';
import { FileText, Download } from 'lucide-react';

function App() {
  const [plans, setPlans] = useState([]);
  const [showCalculator, setShowCalculator] = useState(false);

  const handlePlansLoaded = (loadedPlans) => {
    setPlans(loadedPlans);
    setShowCalculator(true);
  };

  const downloadTemplate = () => {
    const template = `Plan Name,Semi-Monthly Premium,Deductible Individual,Outpatient Coinsurance,Office Visit Copay,Lab Copay,OOP Max Individual,Notes
Silver PPO 2550/70,351.65,2550,0.45,70,65,8750,Basic coverage
Gold PPO 1000/30,427.87,1000,0.20,30,30,7900,Balanced coverage
Gold HDHP 1750/15%,423.61,1750,0.15,ded,ded,4000,HSA-eligible
Platinum PPO 250/15,495.48,250,0.10,15,20,4300,Premium coverage`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'health-plan-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Health Plan Analyzer
          </h1>
          <p className="text-gray-600">
            Compare insurance plans and find the best value for your healthcare needs
          </p>
        </header>

        {!showCalculator ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Get Started
                </h2>
                <p className="text-gray-600 mb-4">
                  Upload your health plan data in CSV format or download our template to get started.
                </p>
                
                <button
                  onClick={downloadTemplate}
                  className="flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg mb-4 transition-colors"
                >
                  <Download className="mr-2" size={20} />
                  Download CSV Template
                </button>
              </div>

              <PlanUploader onPlansLoaded={handlePlansLoaded} />
              
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-start">
                  <FileText className="text-blue-500 mr-3 mt-1" size={20} />
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold mb-1">CSV Format Requirements:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Include column headers exactly as shown in template</li>
                      <li>Enter coinsurance as decimal (0.45 for 45%)</li>
                      <li>Use "ded" for copays subject to deductible</li>
                      <li>You can compare 2-6 plans at once</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowCalculator(false)}
              className="mb-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded transition-colors"
            >
              ← Upload Different Plans
            </button>
            <CostCalculator plans={plans} />
          </>
        )}

        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>
            Health Plan Analyzer • Open Source Tool for Healthcare Decision Making
          </p>
          <p className="mt-2">
            Disclaimer: This tool provides estimates for comparison purposes only. 
            Always verify costs with your insurance provider.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
