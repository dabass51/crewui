"use client"

import React, { useState, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ConnectionMode,
    Handle,
    Position,
    getIncomers,
    getOutgoers,
    getConnectedEdges,
    NodeProps,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlusCircle, Edit, X, Save, Upload, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NodeType = 'agent' | 'task' | 'crew';

interface FormData {
    type?: NodeType;
    name?: string;
    role?: string;
    goal?: string;
    backstory?: string;
    tools?: string[];
    description?: string;
    expectedOutput?: string;
}

interface Model {
    nodes: Node<Node>[];
    edges: Edge[];
}

const NodeComponent = ({ id, data, selected }: NodeProps<Node>) => {
    const { setNodes } = useReactFlow();
    const colorMap: Record<NodeType, string> = {
        agent: 'bg-blue-100',
        task: 'bg-green-100',
        crew: 'bg-red-100',
    };

    const borderStyle = selected ? 'border-2 border-blue-500' : 'border border-gray-300';

    const handleClick = () => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                selected: node.id === id,
            }))
        );
    };

    return (
        <div
            className={`p-2 rounded ${colorMap[data.type as string]} ${borderStyle} transition-all duration-200 cursor-pointer`}
            onClick={handleClick}
        >
            {data.type !== 'crew' && <Handle type="target" position={Position.Left} />}
            {data.type !== 'task' && <Handle type="source" position={Position.Right} />}
            <div className="font-bold">{data.name}</div>
            {Object.entries(data).map(([key, value]) => {
                if (key !== 'name' && key !== 'type') {
                    return <div key={key}>{key}: {value}</div>;
                }
            })}
        </div>
    );
};

const nodeTypes = {
    agent: NodeComponent,
    task: NodeComponent,
    crew: NodeComponent,
};

// Presets
const presets = {
    'simple-task': {
        nodes: [
            { id: 'crew-1', type: 'crew', position: { x: 0, y: 0 }, data: { type: 'crew', name: 'Simple Crew', description: 'A crew for a simple task' } },
            { id: 'agent-1', type: 'agent', position: { x: 200, y: 0 }, data: { type: 'agent', name: 'Task Executor', role: 'Executor', goal: 'Execute the task', backstory: 'Efficient agent for simple tasks', tools: 'basic_tools' } },
            { id: 'task-1', type: 'task', position: { x: 400, y: 0 }, data: { type: 'task', name: 'Simple Task', description: 'A straightforward task to be executed', expectedOutput: 'Completed task' } },
        ],
        edges: [
            { id: 'e1-2', source: 'crew-1', target: 'agent-1' },
            { id: 'e2-3', source: 'agent-1', target: 'task-1' },
        ],
    },
    'research-team': {
        nodes: [
            { id: 'crew-1', type: 'crew', position: { x: 0, y: 100 }, data: { type: 'crew', name: 'Research Team', description: 'A crew for conducting research' } },
            { id: 'agent-1', type: 'agent', position: { x: 250, y: 0 }, data: { type: 'agent', name: 'Lead Researcher', role: 'Research Lead', goal: 'Guide the research process', backstory: 'Experienced researcher with multiple publications', tools: 'academic_database,data_analysis' } },
            { id: 'agent-2', type: 'agent', position: { x: 250, y: 200 }, data: { type: 'agent', name: 'Data Analyst', role: 'Analyst', goal: 'Analyze research data', backstory: 'Skilled in statistical analysis and data visualization', tools: 'statistical_software,visualization_tools' } },
            { id: 'task-1', type: 'task', position: { x: 500, y: 0 }, data: { type: 'task', name: 'Literature Review', description: 'Conduct a comprehensive literature review', expectedOutput: 'Summary of relevant research' } },
            { id: 'task-2', type: 'task', position: { x: 500, y: 200 }, data: { type: 'task', name: 'Data Analysis', description: 'Analyze collected data and draw conclusions', expectedOutput: 'Statistical report and visualizations' } },
        ],
        edges: [
            { id: 'e1-2', source: 'crew-1', target: 'agent-1' },
            { id: 'e1-3', source: 'crew-1', target: 'agent-2' },
            { id: 'e2-4', source: 'agent-1', target: 'task-1' },
            { id: 'e3-5', source: 'agent-2', target: 'task-2' },
        ],
    },
};

const predefinedTools = [
    "web_search",
    "calculator",
    "data_analysis",
    "text_summarization",
    "language_translation",
    "image_recognition",
    "speech_to_text",
    "text_to_speech",
    "sentiment_analysis",
    "code_generation",
    "database_query",
    "file_manipulation",
    "api_integration",
    "natural_language_processing",
    "machine_learning"
];

const CrewAIBuilder = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [formType, setFormType] = useState<NodeType | null>(null);
    const [formData, setFormData] = useState<FormData>({ tools: [] });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [dataModel, setDataModel] = useState('');
    const [pythonPreview, setPythonPreview] = useState('');

    const updateDataModel = useCallback(() => {
        // @ts-ignore
        const model:Model = {
            nodes: nodes.map(node => ({
                id: node.id,
                type: node.type,
                data: node.data
            })),
            edges: edges
        };
        setDataModel(JSON.stringify(model, null, 2));
        updatePythonPreview(model);
    }, [nodes, edges]);

    const updatePythonPreview = useCallback((model: { nodes: Node<NodeData>[]; edges: Edge[]; }) => {
        let preview = 'from crewai import Agent, Task, Crew\n\n';

        // Create agents
        model.nodes
            .filter(node => node.type === 'agent')
            .forEach(agent => {
                preview += `${agent.id} = Agent(\n`;
                preview += `    role="${agent.data.role || ''}",\n`;
                preview += `    goal="${agent.data.goal || ''}",\n`;
                preview += `    backstory="${agent.data.backstory || ''}",\n`;
                if (Array.isArray(agent.data.tools) && agent.data.tools.length > 0) {
                    preview += `    tools=[${agent.data.tools.map(tool => `"${tool}"`).join(', ')}]\n`;
                } else {
                    preview += `    tools=[]\n`;
                }
                preview += ')\n\n';
            });

        // Create tasks
        model.nodes
            .filter(node => node.type === 'task')
            .forEach(task => {
                preview += `${task.id} = Task(\n`;
                preview += `    description="${task.data.description || ''}",\n`;
                preview += `    expected_output="${task.data.expectedOutput || ''}"\n`;
                preview += ')\n\n';
            });

        // Create crew
        const crew = model.nodes.find(node => node.type === 'crew');
        if (crew) {
            preview += `crew = Crew(\n`;
            preview += `    agents=[${model.nodes.filter(node => node.type === 'agent').map(agent => agent.id).join(', ')}],\n`;
            preview += `    tasks=[${model.nodes.filter(node => node.type === 'task').map(task => task.id).join(', ')}]\n`;
            preview += ')\n\n';
            preview += 'result = crew.kickoff()\n';
        }

        setPythonPreview(preview);
    }, []);

    const onConnect = useCallback((params: Connection) => {
        const sourceNode = nodes.find(node => node.id === params.source);
        const targetNode = nodes.find(node => node.id === params.target);

        if (sourceNode && targetNode) {
            if (
                (sourceNode.type === 'crew' && (targetNode.type === 'agent' || targetNode.type === 'task')) ||
                (sourceNode.type === 'agent' && targetNode.type === 'task')
            ) {
                setEdges((eds) => addEdge({ ...params, animated: true }, eds));
            } else {
                alert("Invalid connection. Please check the logical dependencies.");
            }
        }
    }, [nodes, setEdges]);

    const onNodesDelete = useCallback(
        (deleted: Node<Node>[]) => {
            setEdges(
                deleted.reduce((acc, node) => {
                    const incomers = getIncomers(node, nodes, edges);
                    const outgoers = getOutgoers(node, nodes, edges);
                    const connectedEdges = getConnectedEdges([node], edges);

                    const remainingEdges = acc.filter(
                        (edge) => !connectedEdges.includes(edge)
                    );

                    const createdEdges = incomers.flatMap(({ id: source }) =>
                        outgoers.map(({ id: target }) => ({
                            id: `${source}->${target}`,
                            source,
                            target,
                        }))
                    );

                    return [...remainingEdges, ...createdEdges];
                }, edges)
            );
        },
        [nodes, edges, setEdges]
    );

    const handleAddNode = () => {
        if (formType) {
            // @ts-ignore
            const newNode: Node<Node> = {
                id: `${formType}-${Date.now()}`,
                type: formType,
                position: { x: Math.random() * 300, y: Math.random() * 300 },
                data: { ...formData, type: formType },
            };
            setNodes((nds) => nds.concat(newNode));
            setFormType(null);
            setFormData({ tools: [] });
        }
    };

    const handleUpdateNode = () => {
        if (editingNodeId) {
            setNodes((nds) =>
                nds.map((node) =>
                    node.id === editingNodeId
                        ? { ...node, data: { ...formData, type: node.data.type } }
                        : node
                )
            );
            setEditingNodeId(null);
            setFormData({ tools: [] });
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleToolChange = useCallback((tool: string) => {
        setFormData(prev => {
            // @ts-ignore
            const updatedTools = prev.tools?.includes(tool)
                ? prev.tools.filter(t => t !== tool)
                : [...(prev.tools || []), tool];
            return { ...prev, tools: updatedTools };
        });
    }, []);

    const handleCloseEdit = () => {
        setEditingNodeId(null);
        setFormData({ tools: [] });
        setFormType(null);
    };

    const saveToLocalStorage = () => {
        const flow = {
            nodes,
            edges,
        };
        localStorage.setItem('crewAIFlow', JSON.stringify(flow));
        alert('Flow saved to localStorage');
    };

    const loadFromLocalStorage = () => {
        const flow = localStorage.getItem('crewAIFlow');
        if (flow) {
            const { nodes: savedNodes, edges: savedEdges } = JSON.parse(flow);
            setNodes(savedNodes);
            setEdges(savedEdges);
        }
    };

    const loadPreset = (presetName: string) => {
        const preset = presets[presetName as keyof typeof presets];
        if (preset) {
            setNodes(preset.nodes);
            setEdges(preset.edges);
        }
    };

    useEffect(() => {
        const selectedNode:Node | undefined = nodes.find((node) => node.selected);
        if (selectedNode) {
            setEditingNodeId(selectedNode.id);
            // @ts-ignore
            setFormData(selectedNode.data);
            // @ts-ignore
            setFormType(selectedNode.data.type);
        } else {
            setEditingNodeId(null);
            setFormData({ tools: [] });
            setFormType(null);
        }
    }, [nodes]);

    useEffect(() => {

        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        updateDataModel();
    }, [nodes, edges, updateDataModel]);

    const renderForm = () => {
        if (!formType) return null;

        const commonFields = (
            <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={formData.name || ''} onChange={handleFormChange} required />
            </div>
        );

        switch (formType) {
            case 'agent':
                return (
                    <>
                        {commonFields}
                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Input id="role" name="role" value={formData.role || ''} onChange={handleFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="goal">Goal</Label>
                            <Input id="goal" name="goal" value={formData.goal || ''} onChange={handleFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="backstory">Backstory</Label>
                            <Textarea id="backstory" name="backstory" value={formData.backstory || ''} onChange={handleFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="tools">Tools</Label>
                            {predefinedTools.map((tool) => (
                                <div key={tool} className="flex items-center space-x-2">
                                    <Checkbox
                                        className="mb-2"
                                        id={`tool-${tool}`}
                                        checked={formData.tools?.includes(tool)}
                                        onCheckedChange={() => handleToolChange(tool)}
                                    />
                                    <Label htmlFor={`tool-${tool}`}>{tool}</Label>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 'task':
                return (
                    <>
                        {commonFields}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleFormChange} required />
                        </div>
                        <div>
                            <Label htmlFor="expectedOutput">Expected Output</Label>
                            <Input id="expectedOutput" name="expectedOutput" value={formData.expectedOutput || ''} onChange={handleFormChange} required />
                        </div>
                    </>
                );
            case 'crew':
                return (
                    <>
                        {commonFields}
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleFormChange} required />
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="flex flex-col h-screen md:flex-row">
            {/* Sidebar */}
            <div className={`w-full md:w-1/4 p-4 border-b md:border-r overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'h-1/2 md:h-full' : 'h-16'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{editingNodeId ? 'Edit Node' : 'Add Node'}</h2>
                    <div className="flex space-x-2">
                        {editingNodeId && (
                            <Button onClick={handleCloseEdit} variant="outline" size="sm">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                        <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} variant="outline" size="sm" className="md:hidden">
                            {isSidebarOpen ? <Menu className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                {isSidebarOpen && (
                    <>
                        {!editingNodeId && (
                            <div className="space-y-2 mb-4">
                                {(['crew', 'agent', 'task']).map((type) => (
                                    <Button key={type} onClick={() => setFormType(type as NodeType)} className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        )}
                        {formType && (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                editingNodeId ? handleUpdateNode() : handleAddNode();
                            }} className="space-y-4">
                                {renderForm()}
                                <Button type="submit" className="w-full">
                                    {editingNodeId ? <><Edit className="mr-2 h-4 w-4" /> Update Node</> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Node</>}
                                </Button>
                            </form>
                        )}
                        <div className="mt-8 space-y-4">
                            <Button onClick={saveToLocalStorage} className="w-full">
                                <Save className="mr-2 h-4 w-4" /> Save Flow
                            </Button>
                            <Button onClick={loadFromLocalStorage} className="w-full">
                                <Upload className="mr-2 h-4 w-4" /> Load Flow
                            </Button>
                            <Select onValueChange={loadPreset}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Load Preset" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="simple-task">Simple Task</SelectItem>
                                    <SelectItem value="research-team">Research Team</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
            </div>

            {/* Flow Area */}
            <div className="flex-1 h-1/2 md:h-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onNodesDelete={onNodesDelete}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                    selectionOnDrag
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
            <div className="h-1/3 p-4 border-t">
                <Tabs defaultValue="json">
                    <TabsList>
                        <TabsTrigger value="json">JSON Data Model</TabsTrigger>
                        <TabsTrigger value="python">Python Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="json">
                        <Textarea
                            value={dataModel}
                            readOnly
                            className="w-full h-[calc(100vh/3-80px)] font-mono text-sm"
                        />
                    </TabsContent>
                    <TabsContent value="python">
                        <Textarea
                            value={pythonPreview}
                            readOnly
                            className="w-full h-[calc(100vh/3-80px)] font-mono text-sm"
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default CrewAIBuilder;
