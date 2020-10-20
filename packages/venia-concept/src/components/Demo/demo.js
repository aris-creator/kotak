import { gql, useQuery } from "@apollo/client"
import React, { useEffect, useMemo } from "react"

import classes from "./demo.css"

const listQuery = gql`
    query GetCategories {
        categoryList(
            filters: {
                ids: {
                    in: ["2"]
                }
            }
        ) {
            children_count
            children {
                id
                name
            }
        }
    }
`

const TopLevelCategory = props => {
    const { data } = props
    const { name } = data

    return (
        <div className={classes.category}>
            {name}
        </div>
    )
}

const TopLevelCategoryPlaceholder = () => {
    return <div className={classes.placeholder} />
}

const Demo = props => {
    const { max = 5 } = props
    const { data } = useQuery(listQuery)

    const topLevels = useMemo(() => {
        if (data) {
            const { categoryList } = data
            const [{ children }] = categoryList
            console.log("top levels", children)

            return Array.from(
                children,
                child => <TopLevelCategory key={child.id} data={child} />
            )
        }

        return Array.from(
            { length: max },
            (_, index) => <TopLevelCategoryPlaceholder key={index} />
        )
    }, [data, max])

    return (
        <div className={classes.menu}>
            {topLevels}
        </div>
    )
}

export default Demo
