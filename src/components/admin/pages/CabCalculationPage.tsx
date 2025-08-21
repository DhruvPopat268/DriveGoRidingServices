
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface CabModel {
  id: string;
  modelType: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
}

const modelTypes = [
  { value: 'oneway', label: 'One Way Model' },
  { value: 'roundtrip', label: 'Round Trip Model' },
  { value: 'hourly', label: 'Hourly Model' },
  { value: 'monthly', label: 'Monthly Cab Model' },
  { value: 'weekly', label: 'Weekly Cab Model' }
];

export const CabCalculationPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState('');
  const [models, setModels] = useState<CabModel[]>([]);
  const [formData, setFormData] = useState({
    baseFare: '',
    perKmRate: '',
    perMinuteRate: '',
    minimumFare: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelType) return;

    const newModel: CabModel = {
      id: Date.now().toString(),
      modelType: modelTypes.find(m => m.value === selectedModelType)?.label || '',
      baseFare: parseFloat(formData.baseFare),
      perKmRate: parseFloat(formData.perKmRate),
      perMinuteRate: parseFloat(formData.perMinuteRate),
      minimumFare: parseFloat(formData.minimumFare)
    };

    setModels([...models, newModel]);
    setFormData({ baseFare: '', perKmRate: '', perMinuteRate: '', minimumFare: '' });
    setSelectedModelType('');
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setModels(models.filter(model => model.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white dark:text-white text-gray-900">Cab Calculation Model</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Cab Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Add Cab Calculation Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="modelType">Model Type</Label>
                <Select value={selectedModelType} onValueChange={setSelectedModelType}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select model type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {modelTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-600">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="baseFare">Base Fare</Label>
                  <Input
                    id="baseFare"
                    type="number"
                    step="0.01"
                    value={formData.baseFare}
                    onChange={(e) => setFormData({ ...formData, baseFare: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="perKmRate">Per KM Rate</Label>
                  <Input
                    id="perKmRate"
                    type="number"
                    step="0.01"
                    value={formData.perKmRate}
                    onChange={(e) => setFormData({ ...formData, perKmRate: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="perMinuteRate">Per Minute Rate</Label>
                  <Input
                    id="perMinuteRate"
                    type="number"
                    step="0.01"
                    value={formData.perMinuteRate}
                    onChange={(e) => setFormData({ ...formData, perMinuteRate: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimumFare">Minimum Fare</Label>
                  <Input
                    id="minimumFare"
                    type="number"
                    step="0.01"
                    value={formData.minimumFare}
                    onChange={(e) => setFormData({ ...formData, minimumFare: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Add Model
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Cab Calculation Models</CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No cab models added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">Model Type</th>
                    <th className="text-left py-3 px-4 text-gray-300">Base Fare</th>
                    <th className="text-left py-3 px-4 text-gray-300">Per KM Rate</th>
                    <th className="text-left py-3 px-4 text-gray-300">Per Minute Rate</th>
                    <th className="text-left py-3 px-4 text-gray-300">Minimum Fare</th>
                    <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className="border-b border-gray-700">
                      <td className="py-3 px-4 text-white">{model.modelType}</td>
                      <td className="py-3 px-4 text-white">${model.baseFare}</td>
                      <td className="py-3 px-4 text-white">${model.perKmRate}</td>
                      <td className="py-3 px-4 text-white">${model.perMinuteRate}</td>
                      <td className="py-3 px-4 text-white">${model.minimumFare}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(model.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
