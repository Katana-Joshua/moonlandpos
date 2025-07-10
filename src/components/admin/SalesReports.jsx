
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/contexts/POSContext.jsx';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import SalesReportFilter from '@/components/admin/reports/SalesReportFilter';
import { generatePDF } from '@/components/admin/reports/pdfGenerator';
import { toast } from '@/components/ui/use-toast';

const SalesReports = () => {
  const { sales, expenses } = usePOS();
  const [filteredSales, setFilteredSales] = useState(sales);
  const [filteredExpenses, setFilteredExpenses] = useState(expenses);

  useEffect(() => {
    setFilteredSales(sales);
    setFilteredExpenses(expenses);
  }, [sales, expenses]);

  const handleFilter = ({ sales, expenses }) => {
    setFilteredSales(sales);
    setFilteredExpenses(expenses);
  };

  const handleGeneratePDF = () => {
    if (filteredSales.length === 0 && filteredExpenses.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data to export',
        variant: 'destructive',
      });
      return;
    }
    generatePDF(filteredSales, filteredExpenses);
    toast({
        title: 'PDF Generated',
        description: 'Financial report has been downloaded',
    });
  };

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalProfit - totalExpenses;

  // Ensure numbers are numbers and remove leading zeros
  const totalRevenueNum = Number(totalRevenue) || 0;
  const totalExpensesNum = Number(totalExpenses) || 0;
  const netProfitNum = Number(netProfit) || 0;

  // Utility to strip leading zeros
  const stripLeadingZeros = num => {
    if (typeof num === 'number') return num;
    if (typeof num === 'string') return num.replace(/^0+(?!$)/, '');
    return num;
  };

  return (
    <div className="space-y-6">
      {/* Actions - move Download button to top right */}
      <div className="flex justify-end mb-2">
        <Button onClick={handleGeneratePDF} className="bg-green-600 hover:bg-green-700 shadow-lg">
          <Download className="w-4 h-4 mr-2" />
          Download PDF Report
        </Button>
      </div>
      {/* Filter Controls */}
      <SalesReportFilter onFilter={handleFilter} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-effect border-amber-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-200/80">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-100">UGX {stripLeadingZeros(totalRevenueNum).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-red-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-200/80">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">UGX {stripLeadingZeros(totalExpensesNum).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-green-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-200/80">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfitNum >= 0 ? 'text-green-400' : 'text-red-400'}`}>UGX {stripLeadingZeros(netProfitNum).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Records List */}
      <Card className="glass-effect border-amber-800/50">
        <CardHeader>
          <CardTitle className="text-amber-100">
            Filtered Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-amber-100 text-lg">Sales ({filteredSales.length})</h3>
            {filteredSales.length === 0 ? (
              <p className="text-amber-200/60 text-center py-4">No sales records found for this period.</p>
            ) : (
              filteredSales.map((sale, index) => {
                // Ensure sale.items is always an array
                let items = [];
                if (Array.isArray(sale.items)) {
                  items = sale.items;
                } else if (typeof sale.items === 'string') {
                  try {
                    items = JSON.parse(sale.items);
                  } catch {
                    items = [];
                  }
                }
                return (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-black/20 rounded-lg border border-amber-800/30"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-amber-100">Receipt #{sale.receiptNumber}</p>
                        <p className="text-sm text-amber-200/80">
                          {new Date(sale.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-100">UGX {stripLeadingZeros(sale.total).toLocaleString()}</p>
                        <p className="text-sm text-green-400">Profit: UGX {stripLeadingZeros(sale.profit || 0).toLocaleString()}</p>
                      </div>
                    </div>
                     <div className="text-sm text-amber-200/70 border-t border-amber-800/30 pt-2 mt-2">
                       {items.map((item, idx) => (
                         <span key={idx} className="mr-2">
                           {item.name} x{item.quantity}
                         </span>
                       ))}
                     </div>
                  </motion.div>
                );
              })
            )}
            <h3 className="font-semibold text-red-100 text-lg mt-6">Expenses ({filteredExpenses.length})</h3>
            {filteredExpenses.length === 0 ? (
              <p className="text-amber-200/60 text-center py-4">No expense records found for this period.</p>
            ) : (
              filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-black/20 rounded-lg border border-red-800/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-red-100">{expense.description}</p>
                      <p className="text-sm text-red-200/80">
                        {new Date(expense.timestamp).toLocaleString()} by {expense.cashier}
                      </p>
                    </div>
                    <p className="font-bold text-red-200">- UGX {expense.amount.toLocaleString()}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReports;
