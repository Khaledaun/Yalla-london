
'use client';

import React, { useState } from 'react';
import { sanitizeHtml } from '@/lib/html-sanitizer';
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
  HelpCircle,
  Save
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

// SortableFAQItem component
interface SortableFAQItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableFAQItem({ id, children }: SortableFAQItemProps) {
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
import { motion } from 'framer-motion';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQBuilderProps {
  initialFaqs?: FAQItem[];
  onSave: (faqs: FAQItem[], schema: any) => void;
  showInContent?: boolean;
}

export function FAQBuilder({ 
  initialFaqs = [], 
  onSave,
  showInContent = true 
}: FAQBuilderProps) {
  const [faqs, setFaqs] = useState<FAQItem[]>(
    initialFaqs.length > 0 ? initialFaqs : [
      { id: '1', question: '', answer: '' }
    ]
  );
  const [previewMode, setPreviewMode] = useState<'visual' | 'schema'>('visual');

  const addFAQ = () => {
    const newFAQ: FAQItem = {
      id: Date.now().toString(),
      question: '',
      answer: ''
    };
    setFaqs(prev => [...prev, newFAQ]);
  };

  const removeFAQ = (id: string) => {
    setFaqs(prev => prev.filter(faq => faq.id !== id));
  };

  const updateFAQ = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(prev => prev.map(faq => 
      faq.id === id ? { ...faq, [field]: value } : faq
    ));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = faqs.findIndex((faq) => faq.id === active.id);
    const newIndex = faqs.findIndex((faq) => faq.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedFaqs = arrayMove(faqs, oldIndex, newIndex);
      setFaqs(reorderedFaqs);
    }
  };

  const generateSchema = () => {
    const validFaqs = faqs.filter(faq => faq.question.trim() && faq.answer.trim());
    
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: validFaqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  };

  const handleSave = () => {
    const validFaqs = faqs.filter(faq => faq.question.trim() && faq.answer.trim());
    const schema = generateSchema();
    onSave(validFaqs, schema);
  };

  const renderVisualPreview = () => (
    <div className="space-y-4">
      {faqs
        .filter(faq => faq.question.trim() && faq.answer.trim())
        .map((faq, index) => (
          <div key={faq.id} className="border rounded-lg">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">{index + 1}</span>
                </div>
                <h4 className="font-semibold text-lg">{faq.question}</h4>
              </div>
            </div>
            <div className="p-4">
              <div className="prose prose-sm">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer.replace(/\n/g, '<br>')) }} />
              </div>
            </div>
          </div>
      ))}
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
          <HelpCircle className="h-5 w-5 text-blue-600" />
          <h3 className="text-xl font-bold">FAQ Builder</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addFAQ}>
            <Plus className="h-4 w-4 mr-1" />
            Add FAQ
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save FAQs
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <Card>
          <CardHeader>
            <CardTitle>FAQ Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={faqs.map(faq => faq.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <SortableFAQItem key={faq.id} id={faq.id}>
                      <div className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                          <span className="text-sm font-medium text-gray-500">
                            FAQ #{index + 1}
                          </span>
                          <div className="ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFAQ(faq.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label>Question</Label>
                            <Input
                              value={faq.question}
                              onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                              placeholder="What is your question?"
                            />
                          </div>
                          
                          <div>
                            <Label>Answer</Label>
                            <Textarea
                              value={faq.answer}
                              onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                              placeholder="Provide a detailed answer..."
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </SortableFAQItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

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

      {showInContent && (
        <Card>
          <CardHeader>
            <CardTitle>Display Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="showInContent" defaultChecked />
              <label htmlFor="showInContent">Show FAQ section on page</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="expandFirst" />
              <label htmlFor="expandFirst">Expand first question by default</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="addToSchema" defaultChecked />
              <label htmlFor="addToSchema">Include in structured data</label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
