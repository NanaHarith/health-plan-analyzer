import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

const PlanUploader = ({ onPlansLoaded }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        try {
          const plans = results.data
            .filter(row => row['Plan Name'] && row['Plan Name'].trim() !== '')
            .filter(row => !row['Plan Name'].startsWith('#'))
            .map((row, idx) => {
              const parseValue = (val) => {
                if (val === 'ded' || val === 'deductible') return 'ded';
                const num = parseFloat(val);
                return isNaN(num) ? 0 : num;
              };

              return {
                id: `plan-${idx}`,
                name: row['Plan Name'].trim(),
                premium: parseFloat(row['Semi-Monthly Premium']) || 0,
                deductible: parseFloat(row['Deductible Individual']) || 0,
                outpatient: parseFloat(row['Outpatient Coinsurance']) || 0,
                officeVisit: parseValue(row['Office Visit Copay']),
                lab: parseValue(row['Lab Copay']),
                oopMax: parseFloat(row['OOP Max Individual']) || 0,
                notes: row['Notes'] || '',
                color: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 6]
              };
            });

          if (plans.length === 0) {
            setError('No valid plans found in CSV. Make sure column headers match the template.');
            return;
          }

          if (plans.length > 6) {
            setError('Maximum 6 plans allowed. Only first 6 will be loaded.');
            onPlansLoaded(plans.slice(0, 6));
          } else {
            onPlansLoaded(plans);
          }

          setSuccess(true);
          setError(null);
          setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
          setError(`Error parsing CSV: ${err.message}`);
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('File too large. Maximum size is 1MB');
      return;
    }

    parseCSV(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-lg font-semibold text-gray-700 mb-2">
          Drop your CSV file here
        </p>
        <p className="text-sm text-gray-500">
          or click to browse your files
        </p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex items-start">
            <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
          <div className="flex items-start">
            <CheckCircle className="text-green-500 mr-3 mt-0.5" size={20} />
            <p className="text-sm text-green-700">
              Plans loaded successfully! Redirecting to calculator...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanUploader;