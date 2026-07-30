import { useState } from 'react'
import { ThemeProvider } from './flora-theme/elements/ThemeProvider'
import { TopBar, MainNav } from 'zendesk-globalnav-template'
import { Combobox, Field, Option } from '@zendeskgarden/react-dropdowns'
import styled from 'styled-components'
import UserProfile from './components/UserProfile'
import TabBar from './components/TabBar'
import { PERSONAS, getPersona } from './data/hierarchy'
import './App.css'

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #f8f9f9;
  overflow: hidden;
`

const ContentRow = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
`

const MainContent = styled.main`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #ffffff;
  border-radius: 8px 0px 0px 0px;
  box-shadow: 0px 0px 4px rgba(10, 13, 14, 0.16);
  overflow: hidden;
`

const TopBarRow = styled.div`
  position: relative;
  flex-shrink: 0;
`

const TabBarOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 140px;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 10;
`

// Persona switcher overlaid on the top bar, positioned the same way as the
// version menus in our other prototypes: the TopBar search box (320px) starts
// 404px from the right edge, so 428px leaves a 24px gap beside it.
const PersonaOverlay = styled.div`
  position: absolute;
  top: 0;
  right: 428px;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 10;
`

const PersonaFieldWrapper = styled.div`
  min-width: 260px;
`

export default function App() {
  // Product switcher stays pinned to Support for this prototype.
  const [currentProduct, setCurrentProduct] = useState('support')
  const [activeNavItem, setActiveNavItem] = useState(2)
  const [isSubnavExpanded, setIsSubnavExpanded] = useState(false)

  // Which person's profile we are looking at. Each persona is attached to a
  // different level of the hierarchy, so switching re-roots the tree.
  const [personaId, setPersonaId] = useState(PERSONAS[0].id)
  const persona = getPersona(personaId)

  return (
    <ThemeProvider>
      <PageContainer>
        <TopBarRow>
          <TopBar currentProduct={currentProduct} onProductChange={setCurrentProduct} />
          <TabBarOverlay>
            <TabBar title={persona.name} />
          </TabBarOverlay>
          <PersonaOverlay>
            <PersonaFieldWrapper>
              <Field>
                <Combobox
                  isCompact
                  isEditable={false}
                  inputValue={persona.role}
                  selectionValue={personaId}
                  onChange={({ selectionValue }) => {
                    if (selectionValue) setPersonaId(selectionValue)
                  }}
                >
                  {PERSONAS.map((option) => (
                    <Option key={option.id} value={option.id} label={option.role}>
                      {option.role}
                    </Option>
                  ))}
                </Combobox>
              </Field>
            </PersonaFieldWrapper>
          </PersonaOverlay>
        </TopBarRow>
        <ContentRow>
          <MainNav
            currentProduct="support"
            activeNavItem={activeNavItem}
            setActiveNavItem={setActiveNavItem}
            isSubnavExpanded={isSubnavExpanded}
            setIsSubnavExpanded={setIsSubnavExpanded}
          />
          <MainContent>
            {/* Remount on persona change so the tree's expand state resets to
                all-collapsed for the new person. */}
            <UserProfile key={persona.id} persona={persona} />
          </MainContent>
        </ContentRow>
      </PageContainer>
    </ThemeProvider>
  )
}
