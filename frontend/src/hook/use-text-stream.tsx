// use this hook to fetch data from a stream
// get the cumulative response as it is read
import {useCallback, useEffect, useRef, useState} from 'react'

const URL = "https://cog-sandbox-dev-eastus2-001.openai.azure.com/openai/deployments/gpt-4-32k-blue/chat/completions?api-version=2023-05-15"

export const useTextStream = () => {
    const [text, setText] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)


    return { text, loading, error }
}