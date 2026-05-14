import {
  Box, Typography, Slider, Divider, Chip, TextField, InputAdornment,
  Skeleton, Button, Collapse
} from '@mui/material'
import { Search, FilterList, ExpandMore, ExpandLess } from '@mui/icons-material'
import { useState } from 'react'

const PRICE_RANGE = [0, 2000]

export default function FilterSidebar({
  categories,
  categoriesLoading,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  searchQuery,
  onSearchChange,
  onReset,
}) {
  const [categoriesOpen, setCategoriesOpen] = useState(true)
  const [priceOpen, setPriceOpen] = useState(true)

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    priceRange[0] > PRICE_RANGE[0] ||
    priceRange[1] < PRICE_RANGE[1] ||
    searchQuery !== ''

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            Filters
          </Typography>
        </Box>
        {hasActiveFilters && (
          <Button
            size="small"
            onClick={onReset}
            sx={{
              fontSize: '0.65rem',
              color: 'secondary.dark',
              textDecoration: 'underline',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              minWidth: 'auto',
              p: 0,
            }}
          >
            Reset
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search products…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      <Divider sx={{ mb: 2 }} />

      {/* Category filter */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, cursor: 'pointer' }}
        onClick={() => setCategoriesOpen((v) => !v)}
      >
        <Typography variant="h6" sx={{ color: 'text.primary' }}>
          Category
        </Typography>
        {categoriesOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
      </Box>

      <Collapse in={categoriesOpen}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
          <Chip
            label="All"
            size="small"
            onClick={() => onCategoryChange('all')}
            variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
            sx={{
              bgcolor: selectedCategory === 'all' ? 'primary.main' : 'transparent',
              color: selectedCategory === 'all' ? 'primary.contrastText' : 'text.primary',
              borderColor: selectedCategory === 'all' ? 'primary.main' : 'divider',
              '&:hover': { bgcolor: selectedCategory === 'all' ? 'primary.light' : 'rgba(26,26,26,0.05)' },
            }}
          />
          {categoriesLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={70} height={24} sx={{ borderRadius: 1 }} />
              ))
            : categories.map((cat) => {
                const label = typeof cat === 'string' ? cat : cat.name || cat.slug
                const value = typeof cat === 'string' ? cat : cat.slug
                return (
                  <Chip
                    key={value}
                    label={label.replace(/-/g, ' ')}
                    size="small"
                    onClick={() => onCategoryChange(value)}
                    variant={selectedCategory === value ? 'filled' : 'outlined'}
                    sx={{
                      bgcolor: selectedCategory === value ? 'primary.main' : 'transparent',
                      color: selectedCategory === value ? 'primary.contrastText' : 'text.primary',
                      borderColor: selectedCategory === value ? 'primary.main' : 'divider',
                      '&:hover': {
                        bgcolor: selectedCategory === value ? 'primary.light' : 'rgba(26,26,26,0.05)',
                      },
                      textTransform: 'capitalize',
                    }}
                  />
                )
              })}
        </Box>
      </Collapse>

      <Divider sx={{ mb: 2 }} />

      {/* Price filter */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, cursor: 'pointer' }}
        onClick={() => setPriceOpen((v) => !v)}
      >
        <Typography variant="h6" sx={{ color: 'text.primary' }}>
          Price Range
        </Typography>
        {priceOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
      </Box>

      <Collapse in={priceOpen}>
        <Box sx={{ px: 1, pb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              ${priceRange[0]}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              ${priceRange[1]}
            </Typography>
          </Box>
          <Slider
            value={priceRange}
            onChange={(_, val) => onPriceChange(val)}
            min={PRICE_RANGE[0]}
            max={PRICE_RANGE[1]}
            step={10}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `$${v}`}
          />
        </Box>
      </Collapse>
    </Box>
  )
}
