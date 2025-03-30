import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";

export function ComponentsDemo() {
    const [theme, setTheme] = useState("light");

    return (
        <div className="grid gap-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">UI Components</h2>
                <p className="text-sm text-muted-foreground">Verifying ShadCN UI + Tailwind CSS</p>
            </div>
            
            {/* Card with form components */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Metadata Form Example</CardTitle>
                    <CardDescription>Edit captured content metadata</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" placeholder="Enter title" defaultValue="AI Research Paper" />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="author">Author</Label>
                        <Input id="author" placeholder="Enter author name" defaultValue="John Smith" />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="url">URL</Label>
                        <Input id="url" placeholder="Enter URL" defaultValue="https://example.com/research-paper" />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Content Type</Label>
                        <RadioGroup defaultValue="article">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="article" id="article" />
                                <Label htmlFor="article">Article</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="paper" id="paper" />
                                <Label htmlFor="paper">Research Paper</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="code" id="code" />
                                <Label htmlFor="code">Code Snippet</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2 justify-end">
                    <Button variant="outline">Cancel</Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button>Save Changes</Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Save content metadata</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
            
            {/* Button variants showcase */}
            <Card>
                <CardHeader>
                    <CardTitle>Button Variants</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button variant="default">Default</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                </CardContent>
            </Card>
            
            {/* Tailwind CSS utilities showcase */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-md bg-primary text-primary-foreground shadow-md">Primary</div>
                <div className="p-4 rounded-md bg-secondary text-secondary-foreground shadow-md">Secondary</div>
                <div className="p-4 rounded-md bg-accent text-accent-foreground shadow-md">Accent</div>
                <div className="p-4 rounded-md bg-background border shadow-md">Background</div>
                <div className="p-4 rounded-md bg-foreground text-background shadow-md">Foreground</div>
                <div className="p-4 rounded-md bg-card text-card-foreground shadow-md">Card</div>
            </div>
        </div>
    );
} 