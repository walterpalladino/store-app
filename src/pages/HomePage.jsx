import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Container, Grid, Box, Typography, Pagination, Skeleton,
  Drawer, IconButton, useMediaQuery, useTheme, Alert, Divider,
  Fab, Select, MenuItem, FormControl,
} from '@mui/material'
import { TuneRounded, Close } from '@mui/icons-material'
import { useProducts, useCategories } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import FilterSidebar from '../components/FilterSidebar'

const PRODUCTS_PER_PAGE = 12

function ProductCardSkeleton() {
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(26,26,26,0.08)' }}>
      <Skeleton variant="rectangular" height={220} sx={{ bgcolor: 'rgba(26,26,26,0.05)' }} />
      <Box sx={{ p: 2 }}>
        <Skeleton width="40%" height={14} sx={{ mb: 0.5 }} />
        <Skeleton width="80%" height={20} sx={{ mb: 1 }} />
        <Skeleton width="60%" height={14} sx={{ mb: 1.5 }} />
        <Skeleton width="35%" height={24} />
      </Box>
    </Box>
  )
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Read filter state from URL
  const selectedCategory = searchParams.get('category') || 'all'
  const searchQuery = searchParams.get('search') || ''
  const priceRange = [
    Number(searchParams.get('minPrice') || 0),
    Number(searchParams.get('maxPrice') || 2000),
  ]
  const currentPage = Number(searchParams.get('page') || 1)
  const sortBy = searchParams.get('sort') || 'default'

  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '' || v === 'all' || v === 'default' || v === '0' || (k === 'minPrice' && v === '0') || (k === 'maxPrice' && v === '2000')) {
          next.delete(k)
        } else {
          next.set(k, String(v))
        }
      })
      // Reset page when filters change (except when changing page)
      if (!('page' in updates)) next.delete('page')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const filters = useMemo(
    () => ({
      category: selectedCategory,
      search: searchQuery,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      page: currentPage,
      limit: PRODUCTS_PER_PAGE,
    }),
    [selectedCategory, searchQuery, priceRange[0], priceRange[1], currentPage]
  )

  const { products, total, loading, error } = useProducts(filters)
  const { categories, loading: catLoading } = useCategories()

  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE)

  // Sort products client-side
  const sortedProducts = useMemo(() => {
    const arr = [...products]
    if (sortBy === 'price-asc') arr.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') arr.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') arr.sort((a, b) => b.rating - a.rating)
    return arr
  }, [products, sortBy])

  const handleReset = () => {
    setSearchParams({})
  }

  const sidebar = (
    <FilterSidebar
      categories={categories}
      categoriesLoading={catLoading}
      selectedCategory={selectedCategory}
      onCategoryChange={(v) => updateParams({ category: v })}
      priceRange={priceRange}
      onPriceChange={([min, max]) => updateParams({ minPrice: min, maxPrice: max })}
      searchQuery={searchQuery}
      onSearchChange={(v) => updateParams({ search: v })}
      onReset={handleReset}
    />
  )

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero banner */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          color: '#f5f0e8',
          py: { xs: 5, md: 7 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400, height: 400,
            borderRadius: '50%',
            border: '1px solid rgba(200,169,110,0.15)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600, height: 600,
            borderRadius: '50%',
            border: '1px solid rgba(200,169,110,0.07)',
            pointerEvents: 'none',
          }}
        />

        <Typography
          variant="overline"
          sx={{ color: '#c8a96e', letterSpacing: '0.3em', display: 'block', mb: 1 }}
        >
          New Collection
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontWeight: 300,
            fontSize: { xs: '2.2rem', md: '3.5rem' },
            letterSpacing: '-0.02em',
            mb: 1,
          }}
        >
          Discover Curated Goods
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(245,240,232,0.6)', fontWeight: 300, maxWidth: 440, mx: 'auto' }}
        >
          Thoughtfully selected products for the discerning customer
        </Typography>
      </Box>

      <Container maxWidth="xl" sx={{ py: 5 }}>
        <Grid container spacing={4}>
          {/* Sidebar — desktop */}
          {!isMobile && (
            <Grid item md={3} lg={2.5}>
              <Box
                sx={{
                  position: 'sticky',
                  top: 88,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 3,
                }}
              >
                {sidebar}
              </Box>
            </Grid>
          )}

          {/* Products grid */}
          <Grid item xs={12} md={9} lg={9.5}>
            {/* Toolbar row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {loading ? 'Loading…' : `${total} product${total !== 1 ? 's' : ''} found`}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Sort */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={sortBy}
                    onChange={(e) => updateParams({ sort: e.target.value })}
                    displayEmpty
                    sx={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}
                  >
                    <MenuItem value="default">Sort: Default</MenuItem>
                    <MenuItem value="price-asc">Price: Low → High</MenuItem>
                    <MenuItem value="price-desc">Price: High → Low</MenuItem>
                    <MenuItem value="rating">Top Rated</MenuItem>
                  </Select>
                </FormControl>

                {/* Mobile filter toggle */}
                {isMobile && (
                  <IconButton
                    onClick={() => setDrawerOpen(true)}
                    size="small"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <TuneRounded sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Grid */}
            <Grid container spacing={2.5}>
              {loading
                ? Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
                    <Grid item xs={12} sm={6} lg={4} key={i}>
                      <ProductCardSkeleton />
                    </Grid>
                  ))
                : sortedProducts.length > 0
                  ? sortedProducts.map((product) => (
                      <Grid item xs={12} sm={6} lg={4} key={product.id}>
                        <ProductCard product={product} />
                      </Grid>
                    ))
                  : (
                    <Grid item xs={12}>
                      <Box sx={{ textAlign: 'center', py: 10 }}>
                        <Typography
                          variant="h3"
                          sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, mb: 1 }}
                        >
                          No products found
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                          Try adjusting your filters or search query
                        </Typography>
                      </Box>
                    </Grid>
                  )}
            </Grid>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, p) => updateParams({ page: p })}
                  color="primary"
                  shape="rounded"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em',
                    },
                  }}
                />
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: 'background.paper',
            p: 3,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
            Filters
          </Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        {sidebar}
      </Drawer>
    </Box>
  )
}
