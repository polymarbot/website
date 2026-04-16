/** Unique token entry collected from all chains */
export interface UniqueToken {
  symbol: string
}

export function useBridgeAssets () {
  const request = useRequest()

  const bridgeChains = ref<BridgeSupportedChain[]>([])
  const selectedTokenSymbol = ref('USDC')
  const selectedChainName = ref('Ethereum')

  // -- Computed ---------------------------------------------------------------

  /** All chains with USDC.e injected into Polygon */
  const allChains = computed(() => {
    if (bridgeChains.value.length === 0) return []

    const bridgePolygon = bridgeChains.value.find(c => c.name === 'Polygon')
    const bridgeTokenMap = new Map(
      bridgePolygon?.tokens.map(t => [ t.symbol, t ]) ?? [],
    )
    const polygonTokens: BridgeSupportedToken[] = []
    for (const symbol of SUPPORTED_TOKEN_SYMBOLS) {
      if (symbol === 'USDC.e') {
        polygonTokens.push(POLYGON_USDC_E_TOKEN)
      } else {
        const token = bridgeTokenMap.get(symbol)
        if (token) polygonTokens.push(token)
      }
    }
    const polygonChain: BridgeSupportedChain = {
      chainId: POLYGON_CHAIN_ID,
      name: 'Polygon',
      tokens: polygonTokens,
    }
    return bridgeChains.value.map(c => c.name === 'Polygon' ? polygonChain : c)
  })

  /** Deduplicated tokens across all chains, in SUPPORTED_TOKEN_SYMBOLS order */
  const allTokens = computed<UniqueToken[]>(() => {
    const available = new Set<string>()
    for (const chain of allChains.value) {
      for (const token of chain.tokens) {
        available.add(token.symbol)
      }
    }
    return SUPPORTED_TOKEN_SYMBOLS
      .filter(s => available.has(s))
      .map(s => ({ symbol: s }))
  })

  /** Chains that support the currently selected token */
  const availableChains = computed(() => {
    return allChains.value.filter(c =>
      c.tokens.some(t => t.symbol === selectedTokenSymbol.value),
    )
  })

  const selectedChain = computed(() => {
    return availableChains.value.find(c => c.name === selectedChainName.value)
      ?? availableChains.value[0]
  })

  const selectedToken = computed<BridgeSupportedToken | undefined>(() => {
    if (!selectedChain.value) return undefined
    return selectedChain.value.tokens.find(t => t.symbol === selectedTokenSymbol.value)
      ?? selectedChain.value.tokens[0]
  })

  /** Whether this is a direct transfer (Polygon + USDC.e) */
  const isDirectTransfer = computed(() => {
    return selectedChainName.value === 'Polygon' && selectedTokenSymbol.value === 'USDC.e'
  })

  /** Bridge address field key for the selected chain */
  const chainAddressType = computed<'evm' | 'svm' | 'tron'>(() => {
    const name = selectedChainName.value
    if (name === 'Solana') return 'svm'
    if (name === 'Tron') return 'tron'
    return 'evm'
  })

  /** Token contract address explorer URL */
  const tokenExplorerUrl = computed(() => {
    const token = selectedToken.value
    if (!token) return ''
    return getExplorerTokenUrl(selectedChainName.value, token.address)
  })

  // -- Watchers ---------------------------------------------------------------

  /** Auto-adjust chain when token changes */
  watch(selectedTokenSymbol, symbol => {
    if (symbol === 'USDC.e') {
      selectedChainName.value = 'Polygon'
      return
    }
    const currentChainSupports = availableChains.value.some(
      c => c.name === selectedChainName.value,
    )
    if (!currentChainSupports && availableChains.value.length > 0) {
      selectedChainName.value = availableChains.value[0]!.name
    }
  })

  // -- Actions ----------------------------------------------------------------

  async function fetchSupportedAssets () {
    const response = await request.get<{ chains: BridgeSupportedChain[] }>(
      '/api/wallets/bridge-supported-assets',
    )
    bridgeChains.value = response.chains ?? []
  }

  function resetSelections () {
    selectedTokenSymbol.value = 'USDC'
    selectedChainName.value = 'Ethereum'
  }

  return {
    bridgeChains,
    selectedTokenSymbol,
    selectedChainName,
    allTokens,
    availableChains,
    selectedChain,
    selectedToken,
    isDirectTransfer,
    chainAddressType,
    tokenExplorerUrl,
    fetchSupportedAssets,
    resetSelections,
  }
}
