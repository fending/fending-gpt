'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Edit, Trash2, Save, X, BookOpen, Tag, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface KnowledgeEntry {
  id: string
  category: 'resume' | 'projects' | 'skills' | 'experience' | 'personal' | 'company'
  title: string
  content: string
  tags: string[]
  priority: number
  source: string
  created_at: string
  updated_at: string
}

interface KnowledgeBaseProps {
  prefilledData?: {
    category: string
    title: string
    content: string
    tags: string[]
    priority: number
  }
  onDataUsed?: () => void
}

export default function KnowledgeBase({ prefilledData, onDataUsed }: KnowledgeBaseProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [formData, setFormData] = useState({
    category: 'experience' as KnowledgeEntry['category'],
    title: '',
    content: '',
    tags: [] as string[],
    priority: 3
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetchEntries()
  }, [])

  useEffect(() => {
    if (prefilledData) {
      setFormData({
        category: prefilledData.category as KnowledgeEntry['category'],
        title: prefilledData.title,
        content: prefilledData.content,
        tags: prefilledData.tags,
        priority: prefilledData.priority
      })
      setTagInput(prefilledData.tags.join(', '))
      setShowAddForm(true)
      onDataUsed?.()
    }
  }, [prefilledData, onDataUsed])

  const fetchEntries = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/knowledge?token=${sessionToken}`)
      if (!response.ok) throw new Error('Failed to fetch knowledge entries')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching knowledge entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveEntry = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in title and content')
      return
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const tags = tagInput.split(',').map(tag => tag.trim()).filter(Boolean)
      
      const method = editingEntry ? 'PUT' : 'POST'
      const url = editingEntry 
        ? `/api/admin/knowledge/${editingEntry.id}`
        : '/api/admin/knowledge'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          ...formData,
          tags,
          source: editingEntry ? editingEntry.source : 'manual'
        })
      })

      if (!response.ok) throw new Error('Failed to save knowledge entry')
      
      resetForm()
      await fetchEntries()
      
    } catch (error) {
      console.error('Error saving knowledge entry:', error)
      alert('Failed to save knowledge entry')
    }
  }

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge entry?')) return

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/knowledge/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete knowledge entry')
      
      await fetchEntries()
    } catch (error) {
      console.error('Error deleting knowledge entry:', error)
      alert('Failed to delete knowledge entry')
    }
  }

  const resetForm = () => {
    setFormData({
      category: 'experience',
      title: '',
      content: '',
      tags: [],
      priority: 3
    })
    setTagInput('')
    setShowAddForm(false)
    setEditingEntry(null)
  }

  const startEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setFormData({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      priority: entry.priority
    })
    setTagInput(entry.tags.join(', '))
    setShowAddForm(true)
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    const colors = {
      resume: 'bg-blue-100 text-blue-800',
      projects: 'bg-green-100 text-green-800',
      skills: 'bg-purple-100 text-purple-800',
      experience: 'bg-orange-100 text-orange-800',
      personal: 'bg-pink-100 text-pink-800',
      company: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600'
    if (priority >= 3) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
            <p className="text-gray-600">
              Manage the information the AI uses to answer questions about Brian.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search knowledge entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Categories</option>
            <option value="resume">Resume</option>
            <option value="projects">Projects</option>
            <option value="skills">Skills</option>
            <option value="experience">Experience</option>
            <option value="personal">Personal</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingEntry ? 'Edit Knowledge Entry' : 'Add New Knowledge Entry'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({
                    ...formData,
                    category: e.target.value as KnowledgeEntry['category']
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="resume">Resume</option>
                  <option value="projects">Projects</option>
                  <option value="skills">Skills</option>
                  <option value="experience">Experience</option>
                  <option value="personal">Personal</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-5)
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({
                    ...formData,
                    priority: parseInt(e.target.value)
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={1}>1 - Low</option>
                  <option value={2}>2</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4</option>
                  <option value={5}>5 - High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({
                  ...formData,
                  title: e.target.value
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Brief title for this knowledge"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({
                  ...formData,
                  content: e.target.value
                })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Detailed information about Brian"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEntry}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingEntry ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Entries List */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Knowledge Entries ({filteredEntries.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="p-6 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-medium text-gray-900">{entry.title}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(entry.category)}`}>
                    {entry.category}
                  </span>
                  <span className={`text-sm font-medium ${getPriorityColor(entry.priority)}`}>
                    Priority {entry.priority}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 mb-3">{entry.content}</p>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  {entry.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Tag className="h-3 w-3" />
                      <span>{entry.tags.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-3 w-3" />
                    <span>Source: {entry.source}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredEntries.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No knowledge entries found</p>
              {searchTerm && (
                <p className="text-sm">Try adjusting your search terms</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}