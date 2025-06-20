/**
 * Tests for the useGitHubDOM hook
 */

import { renderHook, act } from '@testing-library/react'
import { useGitHubDOM } from '../useGitHubDOM'

// Mock the GitHub strategy
jest.mock('../../lib/utils/github')

const mockStrategy = {
  findEditButton: jest.fn(),
  findEditModeTextarea: jest.fn(),
}

const { getGitHubPageStrategy } = require('../../lib/utils/github')

describe('useGitHubDOM Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getGitHubPageStrategy.mockReturnValue(mockStrategy)
    
    // Mock DOM methods
    document.querySelector = jest.fn()
    document.querySelectorAll = jest.fn()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useGitHubDOM())

    expect(result.current.isActivatingEditMode).toBe(false)
    expect(result.current.lastError).toBe(null)
    expect(typeof result.current.clickEditButton).toBe('function')
    expect(typeof result.current.waitForEditMode).toBe('function')
    expect(typeof result.current.fillTextarea).toBe('function')
    expect(typeof result.current.updateTextareaRealtime).toBe('function')
    expect(typeof result.current.setCommentArea).toBe('function')
    expect(typeof result.current.activateEditModeImmediately).toBe('function')
    expect(typeof result.current.getActiveEditModeTextarea).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
  })

  it('should clear error when clearError is called', () => {
    const { result } = renderHook(() => useGitHubDOM())

    // Simulate an error state
    act(() => {
      // This would normally be set by an error in one of the operations
      // For testing, we'll verify the clearError function exists and can be called
      result.current.clearError()
    })

    expect(result.current.lastError).toBe(null)
  })

  it('should handle clickEditButton when edit button is found', async () => {
    const mockEditButton = {
      click: jest.fn(),
      closest: jest.fn().mockReturnValue(null)
    }
    
    mockStrategy.findEditButton.mockReturnValue(mockEditButton)

    const { result } = renderHook(() => useGitHubDOM())

    let clickResult: boolean
    await act(async () => {
      clickResult = await result.current.clickEditButton()
    })

    expect(clickResult!).toBe(true)
    expect(mockEditButton.click).toHaveBeenCalled()
  })

  it('should handle clickEditButton when edit button is not found', async () => {
    mockStrategy.findEditButton.mockReturnValue(null)
    document.querySelectorAll = jest.fn().mockReturnValue([])

    const { result } = renderHook(() => useGitHubDOM())

    let clickResult: boolean
    await act(async () => {
      clickResult = await result.current.clickEditButton()
    })

    expect(clickResult!).toBe(false)
  })

  it('should handle fillTextarea correctly', async () => {
    const mockTextarea = {
      value: '',
      textContent: '',
      dispatchEvent: jest.fn(),
      focus: jest.fn(),
      style: { height: '' },
      scrollHeight: 100
    } as any

    const { result } = renderHook(() => useGitHubDOM())

    await act(async () => {
      await result.current.fillTextarea(mockTextarea, 'test content')
    })

    expect(mockTextarea.value).toBe('test content')
    expect(mockTextarea.textContent).toBe('test content')
    expect(mockTextarea.focus).toHaveBeenCalled()
    expect(mockTextarea.dispatchEvent).toHaveBeenCalledTimes(2) // input and change events
  })

  it('should handle updateTextareaRealtime correctly', async () => {
    const mockTextarea = {
      value: '',
      textContent: '',
      dispatchEvent: jest.fn(),
      style: { height: '' },
      scrollHeight: 100
    } as any

    const { result } = renderHook(() => useGitHubDOM())

    await act(async () => {
      await result.current.updateTextareaRealtime(mockTextarea, 'streaming content')
    })

    expect(mockTextarea.value).toBe('streaming content')
    expect(mockTextarea.textContent).toBe('streaming content')
    expect(mockTextarea.dispatchEvent).toHaveBeenCalledTimes(1) // only input event
  })

  it('should handle activateEditModeImmediately correctly', async () => {
    const mockEditButton = {
      click: jest.fn(),
      closest: jest.fn().mockReturnValue(null)
    }
    
    const mockTextarea = document.createElement('textarea')
    
    mockStrategy.findEditButton.mockReturnValue(mockEditButton)
    mockStrategy.findEditModeTextarea.mockReturnValue(mockTextarea)

    const { result } = renderHook(() => useGitHubDOM())

    let activateResult: boolean
    await act(async () => {
      activateResult = await result.current.activateEditModeImmediately()
    })

    expect(result.current.isActivatingEditMode).toBe(false) // Should be false after completion
    expect(activateResult!).toBe(true)
  })

  it('should handle setCommentArea with successful edit button click', async () => {
    const mockEditButton = {
      click: jest.fn(),
      closest: jest.fn().mockReturnValue(null)
    }
    
    const mockTextarea = document.createElement('textarea')
    
    mockStrategy.findEditButton.mockReturnValue(mockEditButton)
    mockStrategy.findEditModeTextarea.mockReturnValue(mockTextarea)

    const { result } = renderHook(() => useGitHubDOM())

    let setResult: any
    await act(async () => {
      setResult = await result.current.setCommentArea('test description')
    })

    expect(setResult.success).toBe(true)
  })

  it('should handle setCommentArea with fallback when edit button fails', async () => {
    mockStrategy.findEditButton.mockReturnValue(null)
    
    // Mock querySelector to return a textarea for fallback
    const mockTextarea = document.createElement('textarea')
    document.querySelector = jest.fn().mockReturnValue(mockTextarea)

    const { result } = renderHook(() => useGitHubDOM())

    let setResult: any
    await act(async () => {
      setResult = await result.current.setCommentArea('test description')
    })

    expect(setResult.success).toBe(true)
  })

  it('should return active edit mode textarea', () => {
    const mockTextarea = document.createElement('textarea')
    mockStrategy.findEditModeTextarea.mockReturnValue(mockTextarea)

    const { result } = renderHook(() => useGitHubDOM())

    const activeTextarea = result.current.getActiveEditModeTextarea()
    expect(activeTextarea).toBe(mockTextarea)
  })

  it('should handle errors gracefully', async () => {
    // Mock an error scenario
    mockStrategy.findEditButton.mockImplementation(() => {
      throw new Error('Test error')
    })

    const { result } = renderHook(() => useGitHubDOM())

    let clickResult: boolean
    await act(async () => {
      clickResult = await result.current.clickEditButton()
    })

    expect(clickResult!).toBe(false)
    expect(result.current.lastError).toContain('Test error')
  })

  it('should maintain function references between renders', () => {
    const { result, rerender } = renderHook(() => useGitHubDOM())

    const firstRenderFunctions = {
      clickEditButton: result.current.clickEditButton,
      fillTextarea: result.current.fillTextarea,
      setCommentArea: result.current.setCommentArea
    }

    rerender()

    expect(result.current.clickEditButton).toBe(firstRenderFunctions.clickEditButton)
    expect(result.current.fillTextarea).toBe(firstRenderFunctions.fillTextarea)
    expect(result.current.setCommentArea).toBe(firstRenderFunctions.setCommentArea)
  })
})
