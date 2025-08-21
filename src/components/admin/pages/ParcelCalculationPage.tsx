
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface ParcelModel {
  id: string;
  modelType: string;
  baseCharge: number;
  perKmRate: number;
  weightMultiplier: number;
  minimumCharge: number;
}

const modelTypes = [
  { value: 'standard', label: 'Standard Delivery' },
  { value: 'express', label: 'Express Delivery' },
  { value: 'sameday', label: 'Same Day Delivery' },
  { value: 'overnight', label: 'Overnight Delivery' },
  { value: 'bulk', label: 'Bulk Delivery' }
];

export const ParcelCalculationPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState('');
  const [models, setModels] = useState<ParcelModel[]>([]);
  const [formData, setFormData] = useState({
    baseCharge: '',
    perKmRate: '',
    weightMultiplier: '',
    minimumCharge: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelType) return;

    const newModel: ParcelModel = {
      id: Date.now().toString(),
      modelType: modelTypes.find(m => m.value === selectedModelType)?.label || '',
      baseCharge: parseFloat(formData.baseCharge),
      perKmRate: parseFloat(formData.perKmRate),
      weightMultiplier: parseFloat(formData.weightMultiplier),
      minimumCharge: parseFloat(formData.minimumCharge)
    };

    setModels([...models, newModel]);
    setFormData({ baseCharge: '', perKmRate: '', weightMultiplier: '', minimumCharge: '' });
    setSelectedModelType('');
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setModels(models.filter(model => model.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white dark:text-white text-gray-900">Parcel Calculation Model</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Parcel Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Add Parcel Calculation Model</DialogTitle>
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
                  <Label htmlFor="baseCharge">Base Charge</Label>
                  <Input
                    id="baseCharge"
                    type="number"
                    step="0.01"
                    value={formData.baseCharge}
                    onChange={(e) => setFormData({ ...formData, baseCharge: e.target.value })}
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
                  <Label htmlFor="weightMultiplier">Weight Multiplier</Label>
                  <Input
                    id="weightMultiplier"
                    type="number"
                    step="0.01"
                    value={formData.weightMultiplier}
                    onChange={(e) => setFormData({ ...formData, weightMultiplier: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimumCharge">Minimum Charge</Label>
                  <Input
                    id="minimumCharge"
                    type="number"
                    step="0.01"
                    value={formData.minimumCharge}
                    onChange={(e) => setFormData({ ...formData, minimumCharge: e.target.value })}
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
          <CardTitle className="text-white">Parcel Calculation Models</CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No parcel models added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">Model Type</th>
                    <th className="text-left py-3 px-4 text-gray-300">Base Charge</th>
                    <th className="text-left py-3 px-4 text-gray-300">Per KM Rate</th>
                    <th className="text-left py-3 px-4 text-gray-300">Weight Multiplier</th>
                    <th className="text-left py-3 px-4 text-gray-300">Minimum Charge</th>
                    <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className="border-b border-gray-700">
                      <td className="py-3 px-4 text-white">{model.modelType}</td>
                      <td className="py-3 px-4 text-white">${model.baseCharge}</td>
                      <td className="py-3 px-4 text-white">${model.perKmRate}</td>
                      <td className="py-3 px-4 text-white">{model.weightMultiplier}x</td>
                      <td className="py-3 px-4 text-white">${model.minimumCharge}</td>
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
