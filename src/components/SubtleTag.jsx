import styled from 'styled-components'

/**
 * A quieter tag than Garden's `<Tag hue="grey">`, which fills with grey.300 and
 * reads as loud as a status chip. These tags ("Agent", "current") are labels,
 * not statuses — they should sit behind the name they annotate.
 *
 * Flora's neutral recipe, one step down the same ramp Garden uses: grey.100
 * surface, grey.200 hairline, grey.700 text. Contrast on grey.700 over grey.100
 * is ~5.3:1, so it still clears AA at this size.
 */
const SubtleTag = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border: 1px solid #eae9e8;
  border-radius: 10px;
  background-color: #f7f7f7;
  color: #646864;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
`

export default SubtleTag
