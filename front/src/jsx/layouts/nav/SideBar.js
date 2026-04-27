import React, { useReducer,  useEffect, useState } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import {Collapse} from 'react-bootstrap';
import { Link } from "react-router-dom";
import {useScrollPosition} from "@n8tb1t/use-scroll-position";
import { MenuList } from "./Menu";
import {
  fetchMyPermissions,
  filterMenuByAccess,
} from "../../../services/permissionService";



const reducer = (previousState, updatedState) => ({
  ...previousState,
  ...updatedState,
});

const initialState = {
  active : "",
  activeSubmenu : "",
}

const SideBar = () => {
  const [state, setState] = useReducer(reducer, initialState);
  const [menu, setMenu] = useState(MenuList);
  const [loadingMenu, setLoadingMenu] = useState(true);

    const [hideOnScroll, setHideOnScroll] = useState(true)
    useScrollPosition(
      ({ prevPos, currPos }) => {
        const isShow = currPos.y > prevPos.y
        if (isShow !== hideOnScroll) setHideOnScroll(isShow)
      },
      [hideOnScroll]
    )
  
   
    const handleMenuActive = status => {		
      setState({active : status});			
      if(state.active === status){				
        setState({active : ""});
      }   
    }
    const handleSubmenuActive = (status) => {		
      setState({activeSubmenu : status})
      if(state.activeSubmenu === status){
        setState({activeSubmenu : ""})			
      }    
    }

    /// Path
    let path = window.location.pathname;
    path = path.split("/");
    path = path[path.length - 1];

    useEffect(() => {
      menu.forEach((data) => {
        data.content?.forEach((item) => {        
          if(path === item.to){         
            setState({active : data.title})          
          }
          item.content?.forEach(ele => {
            if(path === ele.to){
              setState({activeSubmenu : item.title, active : data.title})
            }
          })
        })
    })
    },[path, menu]);

    useEffect(() => {
      let cancelled = false;
      setLoadingMenu(true);
      fetchMyPermissions()
        .then((doc) => {
          if (cancelled) return;
          setMenu(
            filterMenuByAccess(MenuList, doc.assigned, doc.permissions)
          );
        })
        .catch(() => {
          if (!cancelled) setMenu(MenuList);
        })
        .finally(() => {
          if (!cancelled) setLoadingMenu(false);
        });
      return () => {
        cancelled = true;
      };
    }, []);
  

    return (
      <div className="deznav">
        <PerfectScrollbar className="deznav-scroll">
            {loadingMenu ? (
              <div id="preloader" className="py-5">
                <div className="sk-three-bounce">
                  <div className="sk-child sk-bounce1"></div>
                  <div className="sk-child sk-bounce2"></div>
                  <div className="sk-child sk-bounce3"></div>
                </div>
              </div>
            ) : (
            <ul className="metismenu" id="menu">
              {menu.map((data, index)=>{
                let menuClass = data.classsChange;
                  if(menuClass === "menu-title"){
                    return(
                        <li className={menuClass}  key={index} >{data.title}</li>
                    )
                  }else{
                    return(				
                      <li className={` ${ state.active === data.title ? 'mm-active' : ''}`}
                        key={index} 
                      >
                        {data.content && data.content.length > 0 ?
                            <>
                              <Link to={"#"} 
                                className="has-arrow"
                                onClick={() => {handleMenuActive(data.title)}}
                              >								
                                  {data.iconStyle}
                                  <span className="nav-text">{data.title}</span>
                                  <span className="badge badge-xs style-1 badge-danger">{data.update}</span>
                              </Link>
                              <Collapse in={state.active === data.title ? true :false}>
                                  <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                    {data.content && data.content.map((data,ind) => {									
                                      return(	
                                          <li key={ind}
                                            className={`${ state.activeSubmenu === data.title ? "mm-active" : ""}${data.to === path ? 'mm-active' : ''}`}                                    
                                          >
                                            {data.content && data.content.length > 0 ?
                                                <>
                                                  <Link to={data.to} className={data.hasMenu ? 'has-arrow' : ''}
                                                      onClick={() => { handleSubmenuActive(data.title)}}
                                                  >
                                                    {data.title}
                                                  </Link>
                                                  <Collapse in={state.activeSubmenu === data.title ? true :false}>
                                                      <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                                        {data.content && data.content.map((data,index) => {
                                                          return(	                                                            
                                                            <li key={index}>
                                                              <Link className={`${path === data.to ? "mm-active" : ""}`} to={data.to}>{data.title}</Link>
                                                            </li>
                                                            
                                                          )
                                                        })}
                                                      </ul>
                                                  </Collapse>
                                                </>
                                              :
                                              <Link to={data.to}
                                              className={`${data.to === path ? 'mm-active' : ''}`} 
                                              >
                                                {data.title}
                                              </Link>
                                            }
                                            
                                          </li>                                       
                                      )
                                    })}
                                  </ul>
                                </Collapse>
                            </>
                        :
                          <Link  to={data.to} >
                              {data.iconStyle}
                              <span className="nav-text">{data.title}</span>
                          </Link>
                        }
                        
                      </li>	
                    )
                }
              })}          
          </ul>	
            )}
          
        
            
          </PerfectScrollbar>
      </div>
    );
}

export default SideBar;
