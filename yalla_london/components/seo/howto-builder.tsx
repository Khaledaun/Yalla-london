
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Eye, 
  Code,
  BookOpen,
  Save,
  Clock,
  DollarSign,
  Package,
  Wrench
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableStepItem component for drag and drop
interface SortableStepItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableStepItem({ id, children }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

interface HowToStep {
  id: string;
  name: string;
  text: string;
  image?: string;
}

interface HowToData {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  estimatedCost?: {
    currency: string;
    value: number;
  };
  supplies?: string[];
  tools?: string[];
}

interface HowToBuilderProps {
  initialData?: Partial<HowToData>;
  onSave: (data: HowToData, schema: any) => void;
}

export function HowToBuilder({ initialData = {}, onSave }: HowToBuilderProps) {
  const [howToData, setHowToData] = useState<HowToData>({
    name: '',
    description: '',
    steps: [{ id: '1', name: '', text: '' }],
    supplies: [],
    tools: [],
    ...initialData
  });

  const [previewMode, setPreviewMode] = useState<'visual' | 'schema'>('visual');
  const [suppliesText, setSuppliesText] = useState(howToData.supplies?.join(', ') || '');
  const [toolsText, setToolsText] = useState(howToData.tools?.join(', ') || '');

  const addStep = () => {
    const newStep: HowToStep = {
      id: Date.now().toString(),
      name: '',
      text: ''
    };
    setHowToData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (id: string) => {
    setHowToData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== id)
    }));
  };

  const updateStep = (id: string, field: keyof HowToStep, value: string) => {
    setHowToData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === id ? { ...step, [field]: value } : step
      )
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = howToData.steps.findIndex((step) => step.id === active.id);
    const newIndex = howToData.steps.findIndex((step) => step.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSteps = arrayMove(howToData.steps, oldIndex, newIndex);
      setHowToData(prev => ({ ...prev, steps: reorderedSteps }));
    }
  };

  const updateSupplies = (text: string) => {
    setSuppliesText(text);
    const supplies = text.split(',').map(s => s.trim()).filter(Boolean);
    setHowToData(prev => ({ ...prev, supplies }));
  };

  const updateTools = (text: string) => {
    setToolsText(text);
    const tools = text.split(',').map(t => t.trim()).filter(Boolean);
    setHowToData(prev => ({ ...prev, tools }));
  };

  const generateSchema = () => {
    const validSteps = howToData.steps.filter(step => step.name.trim() && step.text.trim());
    
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: howToData.name,
      description: howToData.description,
      step: validSteps.map(step => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.text,
        ...(step.image && {
          image: {
            '@type': 'ImageObject',
            url: step.image
          }
        })
      }))
    };

    if (howToData.totalTime) {
      schema.totalTime = howToData.totalTime;
    }

    if (howToData.estimatedCost) {
      schema.estimatedCost = {
        '@type': 'MonetaryAmount',
        currency: howToData.estimatedCost.currency,
        value: howToData.estimatedCost.value
      };
    }

    if (howToData.supplies && howToData.supplies.length > 0) {
      schema.supply = howToData.supplies;
    }

    if (howToData.tools && howToData.tools.length > 0) {
      schema.tool = howToData.tools;
    }

    return schema;
  };

  const handleSave = () => {
    const validSteps = howToData.steps.filter(step => step.name.trim() && step.text.trim());
    const dataToSave = { ...howToData, steps: validSteps };
    const schema = generateSchema();
    onSave(dataToSave, schema);
  };

  const renderVisualPreview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{howToData.name || 'How To Guide'}</h2>
        <p className="text-gray-600">{howToData.description}</p>
        
        <div className="flex flex-wrap gap-4 mt-4">
          {howToData.totalTime && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              {howToData.totalTime}
            </div>
          )}
          {howToData.estimatedCost && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="h-4 w-4" />
              {howToData.estimatedCost.currency} {howToData.estimatedCost.value}
            </div>
          )}
        </div>
      </div>

      {/* Supplies and Tools */}
      {((howToData.supplies && howToData.supplies.length > 0) || 
        (howToData.tools && howToData.tools.length > 0)) && (
        <div className="grid md:grid-cols-2 gap-4">
          {howToData.supplies && howToData.supplies.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Supplies Needed</h3>
              </div>
              <ul className="space-y-1">
                {howToData.supplies.map((supply, index) => (
                  <li key={index} className="text-blue-800 text-sm">• {supply}</li>
                ))}
              </ul>
            </div>
          )}

          {howToData.tools && howToData.tools.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Tools Required</h3>
              </div>
              <ul className="space-y-1">
                {howToData.tools.map((tool, index) => (
                  <li key={index} className="text-green-800 text-sm">• {tool}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Steps</h3>
        {howToData.steps
          .filter(step => step.name.trim() && step.text.trim())
          .map((step, index) => (
            <div key={step.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-semibold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{step.name}</h4>
                  <div className="prose prose-sm">
                    <div dangerouslySetInnerHTML={{ __html: step.text.replace(/\n/g, '<br>') }} />
                  </div>
                  {step.image && (
                    <img 
                      src={step.image} 
                      alt={step.name}
                      className="mt-3 rounded-lg max-w-full h-auto"
                    />
                  )}
                </div>
              </div>
            </div>
        ))}
      </div>
    </div>
  );

  const renderSchemaPreview = () => (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      <pre className="text-sm overflow-x-auto">
        {JSON.stringify(generateSchema(), null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <h3 className="text-xl font-bold">How-To Builder</h3>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save How-To Guide
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="howto-name">Title</Label>
                <Input
                  id="howto-name"
                  value={howToData.name}
                  onChange={(e) => setHowToData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="How to do something amazing"
                />
              </div>

              <div>
                <Label htmlFor="howto-description">Description</Label>
                <Textarea
                  id="howto-description"
                  value={howToData.description}
                  onChange={(e) => setHowToData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief overview of what this guide teaches"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-time">Total Time</Label>
                  <Input
                    id="total-time"
                    value={howToData.totalTime || ''}
                    onChange={(e) => setHowToData(prev => ({ ...prev, totalTime: e.target.value }))}
                    placeholder="PT30M (30 minutes)"
                  />
                </div>

                <div>
                  <Label htmlFor="estimated-cost">Estimated Cost</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="USD"
                      className="w-16"
                      value={howToData.estimatedCost?.currency || ''}
                      onChange={(e) => setHowToData(prev => ({
                        ...prev,
                        estimatedCost: {
                          ...prev.estimatedCost!,
                          currency: e.target.value
                        }
                      }))}
                    />
                    <Input
                      placeholder="50"
                      type="number"
                      value={howToData.estimatedCost?.value || ''}
                      onChange={(e) => setHowToData(prev => ({
                        ...prev,
                        estimatedCost: {
                          ...prev.estimatedCost!,
                          value: parseFloat(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="supplies">Supplies (comma-separated)</Label>
                <Input
                  id="supplies"
                  value={suppliesText}
                  onChange={(e) => updateSupplies(e.target.value)}
                  placeholder="flour, eggs, milk"
                />
              </div>

              <div>
                <Label htmlFor="tools">Tools (comma-separated)</Label>
                <Input
                  id="tools"
                  value={toolsText}
                  onChange={(e) => updateTools(e.target.value)}
                  placeholder="mixing bowl, whisk, pan"
                />
              </div>
            </CardContent>
          </Card>

          {/* Steps Editor */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Steps</CardTitle>
                <Button size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={howToData.steps.map(step => step.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {howToData.steps.map((step, index) => (
                      <SortableStepItem key={step.id} id={step.id}>
                        <div className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center gap-2 mb-3">
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                            <span className="text-sm font-medium text-gray-500">
                              Step {index + 1}
                            </span>
                            <div className="ml-auto">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStep(step.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <Label>Step Title</Label>
                              <Input
                                value={step.name}
                                onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                                placeholder="What to do in this step"
                              />
                            </div>
                            
                            <div>
                              <Label>Instructions</Label>
                              <Textarea
                                value={step.text}
                                onChange={(e) => updateStep(step.id, 'text', e.target.value)}
                                placeholder="Detailed step instructions..."
                                rows={3}
                              />
                            </div>

                            <div>
                              <Label>Image URL (optional)</Label>
                              <Input
                                value={step.image || ''}
                                onChange={(e) => updateStep(step.id, 'image', e.target.value)}
                                placeholder="https://thumbs.dreamstime.com/b/workflow-process-flow-step-guide-information-vector-design-generative-ai-clear-illustration-presenting-flowchart-various-393182636.jpg"
                              />
                            </div>
                          </div>
                        </div>
                      </SortableStepItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Preview</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'visual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('visual')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Visual
                </Button>
                <Button
                  variant={previewMode === 'schema' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('schema')}
                >
                  <Code className="h-4 w-4 mr-1" />
                  Schema
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previewMode === 'visual' ? renderVisualPreview() : renderSchemaPreview()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
